#!/usr/bin/env node
const yargs = require('yargs')
const Path = require('path')
const gulp = require('gulp')
const browserSync = require('browser-sync').create()

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
            external: Object.keys(jsPaths),
            paths: cssPaths,
            requireConfig: requireConfig
        })
    )
    return Promise.all(htmlTasks)
}

yargs
    .command({
        command: 'dev',
        desc: 'development',
        handler() {
            process.env.NODE_ENV = 'development'
            browserSync.init({
                ui: {
                    port: 3000
                },
                files: env.browserSync.files,
                reloadDebounce: 150
            })
            execReqireTask().then(() => {
                execHtmlTasks()
            })
            watch([`${env.SRC_DIR}/**/*.*`, env.require_web], function(event) {
                execHtmlTasks()
            })
        }
    })
    .command({
        command: 'build',
        desc: 'production',
        handler() {
            process.env.NODE_ENV = 'production'
            execReqireTask().then(() => {
                execHtmlTasks()
            })
        }
    }).argv

if (!process.argv.slice(2).length) {
    yargs.showHelp()
}
