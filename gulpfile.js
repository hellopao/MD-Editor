var gulp = require('gulp');

var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

gulp.task('pack',function() {
    gulp.src(['./js/showdown.js','./js/wmd.js','./js/translator.js','./js/*.js'])
        .pipe(concat('editor.js'))
        .pipe(uglify())
        .pipe(gulp.dest('./js'))
})
