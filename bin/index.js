#!/usr/bin/env node

const yargs = require('yargs')
require('./tasks')
const gulp = require('gulp')

const pkg = require('../package.json')

yargs
    .version(pkg.version)
    .command({
        command: 'dev',
        desc: 'development mode',
        handler() {
            process.env.NODE_ENV = 'development'
            gulp.start('rpack')
        }
    })
    .command({
        command: 'build',
        desc: 'build project',
        handler() {
            process.env.NODE_ENV = 'production'
            gulp.start('rpack')
        }
    })
    .command({
        command: 'init',
        desc:
            'init require-pack.build.js && require-pack.web.js to quick start project',
        handler() {
            gulp.start('init')
        }
    }).argv

// show help
if (!process.argv.slice(2).length) {
    gulp.start('rpack')
}
