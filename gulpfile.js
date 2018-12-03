'use strict';

const stream = require('stream');
const gulp = require('gulp');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const postcss = require('gulp-postcss');
const inlineImport = require('postcss-import');
const inlineUrl = require('postcss-url');
const autoprefixer = require('autoprefixer');
const zip = require('gulp-zip');

const production = process.env.NODE_ENV === 'production';
const postcssPlugins = [
	inlineImport(),
	autoprefixer({ browsers: '> 5%'}),
	inlineUrl({ url: 'inline' })

];
const outFirefox = './dist/firefox';
const version = '0.1.0';

const coreFiles = [
	'lib/underscore.js',
	'lib/js-signals.js',
	'signals.js',
	'utils.js',
	'dom.js',
	'settings.js',
	'renderer.js',
	'search.js',
	'search_ui.js',
	'dnd.js',
	'outline.js',
	'outline_ui.js',
	'controller.js',
	'selection-notifier.js',
	'clipboard.js'
];

gulp.task('firefox', ['firefox:js', 'firefox:css', 'firefox:assets']);

gulp.task('firefox:js', () => {
	return gulp.src(coreFiles, { cwd: './src' })
		.pipe(concat('xv.js'))
		.pipe(production ? uglify() : pass())
		.pipe(gulp.dest(outFirefox));
});

gulp.task('firefox:css', () => {
	return gulp.src('./css/xv.css')
		.pipe(postcss(postcssPlugins))
		.pipe(gulp.dest(outFirefox));
});

gulp.task('firefox:assets', () => {
	return gulp.src(['./extensions/firefox/**', './src/dnd_feedback.js'])
		.pipe(gulp.dest(outFirefox));
});

gulp.task('firefox:release', ['firefox'], () => {
	return gulp.src(`${outFirefox}/**`)
        .pipe(zip(`prettyxml.${version}.zip`))
        .pipe(gulp.dest('dist/releases'));
});

gulp.task('release', ['firefox:release']);

gulp.task('default', ['firefox']);

function pass() {
	return new stream.PassThrough({ objectMode: true });
}
