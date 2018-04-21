#!/usr/bin/env node
const Path = require('path')
const gulp = require('gulp')
const _ = require('lodash')

const livereload = require('livereload')
const watch = require('gulp-watch')
const glob = require('glob')
const env = require('./env')

const requireTask = require('./require-task')
const htmlTask = require('./html-task')

let requireConfig, jsPaths, cssPaths

const execReqireTask = () => {
    return requireTask().then(ret => {
        requireConfig = ret.requireConfig
        jsPaths = ret.jsPaths
        cssPaths = ret.cssPaths
    })
}

const execHtmlTasks = () => {
    const htmls = glob.sync(env.html)
    const htmlTasks = htmls.map(srcFile =>
        htmlTask(srcFile, {
            external: Object.keys(jsPaths).concat(Object.keys(cssPaths)),
            paths: cssPaths,
            requireConfig: requireConfig
        })
    )
    return Promise.all(htmlTasks)
}

const execWholeTask = () => {
    return execReqireTask().then(() => {
        return execHtmlTasks()
    })
}

if (env.isDev) {
    const liveServer = livereload.createServer({
        delay: 100,
        port: 35729
    })
    liveServer.watch(env.DIST_DIR)
    execWholeTask()
    watch([`${env.SRC_DIR}/**/*.*`], function(event) {
        execHtmlTasks()
    })
    console.log(env.requireWebConfigPath)
    watch([env.requireWebConfigPath], function(e) {
        execWholeTask()
    })
}

if (env.isProd) {
    console.log('[require-pack] build start...')
    process.env.NODE_ENV = 'production'
    execWholeTask().then(() => {
        console.log('[require-pack]  build end')
    })
}
