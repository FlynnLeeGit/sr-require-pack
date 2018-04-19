#!/usr/bin/env node
const Path = require('path')
const gulp = require('gulp')
const browserSync = require('browser-sync').create()
const _ = require('lodash')

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
    const htmls = glob.sync(env.htmls)
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
    const bsOpts = _.merge(
        {
            ui: {
                port: 3000
            },
            open: false,
            files: env.browserSync.files,
            reloadDebounce: 150
        },
        env.browserSync
    )
    browserSync.init(bsOpts)
    execWholeTask()
    watch([`${env.SRC_DIR}/**/*.*`], function(event) {
        execHtmlTasks()
    })
    watch([env.require_web], function(e) {
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
