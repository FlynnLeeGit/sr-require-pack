#!/usr/bin/env node
const Path = require('path')
const gulp = require('gulp')
const _ = require('lodash')

const livereload = require('livereload')
const watch = require('gulp-watch')
const glob = require('glob')
const env = require('./env')
const radomPort = require('./utils/radom-port')

const requireTask = require('./require-task')
const htmlTask = require('./html-task')

let requireConfig, jsPaths, cssPaths, externalPaths

const execReqireTask = () => {
    return requireTask().then(ret => {
        requireConfig = ret.requireConfig
        jsPaths = ret.jsPaths
        cssPaths = ret.cssPaths
        externalPaths = ret.externalPaths
    })
}

const execHtmlTasks = livePort => {
    const htmls = glob.sync(env.html)
    const htmlTasks = htmls.map(srcFile =>
        htmlTask(srcFile, {
            rollupExternal: [
                ...Object.keys(jsPaths),
                ...Object.keys(cssPaths),
                ...Object.keys(externalPaths)
            ],
            rollupPaths: cssPaths,
            requireConfig: requireConfig,
            requireExternal: externalPaths,
            livePort
        })
    )
    return Promise.all(htmlTasks)
}

const execWholeTask = livePort => {
    return execReqireTask().then(() => {
        return execHtmlTasks(livePort)
    })
}

const runDev = port => {
    const liveServer = livereload.createServer({
        delay: 50,
        port,
        // debug:true
    })
    console.log('liveReload on ', port)
    liveServer.watch(env.DIST_DIR)
    execWholeTask(port)
    watch([`${env.SRC_DIR}/**/*.*`], function(event) {
        execHtmlTasks(port)
    })
    watch([env.requireWebConfigPath], function(e) {
        execWholeTask(port)
    })
}

if (env.isDev) {
    if (env.livePort) {
        runDev(env.livePort)
    } else {
        radomPort().then(port => {
            runDev(port)
        })
    }
}

if (env.isProd) {
    console.log('[require-pack] build start...')
    process.env.NODE_ENV = 'production'
    execWholeTask().then(() => {
        console.log('[require-pack]  build end')
    })
}
