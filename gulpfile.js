var gulp = require('gulp');

var concat = require('gulp-concat');

gulp.task('pack',function() {
    gulp.src(['./js/*.js','!./js/showdown.js'])
        .pipe(concat('wmd.js'))
        .pipe(gulp.dest('./'))
})
