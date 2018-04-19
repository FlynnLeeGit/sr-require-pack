const gulp = require('gulp')
const browserSync = require('browser-sync').create()

const watch = require('gulp-watch')
const glob = require('glob')
const env = require('./env')

const requireTask = require('./require-task')
const htmlTask = require('./html-task')

if (env.isDev) {
    browserSync.init({
        ui: {
            port: 3000
        },
        files: env.browserSync.files,
        reloadDebounce: 150
    })
}

let requireConfig, jsPaths, cssPaths
gulp.task('require', function() {
    return requireTask().then(ret => {
        requireConfig = ret.requireConfig
        jsPaths = ret.jsPaths
        cssPaths = ret.cssPaths
    })
})

gulp.task('htmls', ['require'], function() {
    const htmls = glob.sync(env.htmls)
    const htmlTasks = htmls.map(srcFile =>
        htmlTask(srcFile, {
            external: Object.keys(jsPaths),
            paths: cssPaths,
            requireConfig: requireConfig
        })
    )
    return Promise.all(htmlTasks)
})

if (env.isDev) {
    watch([`${env.SRC_DIR}/**/*.*`, env.require_web], function(
        event
    ) {
        gulp.start('htmls')
    })
}

gulp.start('htmls')
