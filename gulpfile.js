var gulp = require("gulp");
var sourcemaps = require("gulp-sourcemaps");
var babel = require("gulp-babel");
var concat = require("gulp-concat");
var coffee = require('gulp-coffee');
var es = require('event-stream');
var gutil = require('gutil');
var peg = require('gulp-peg');
// var browserify = require('browserify');

gulp.task("default", function () {
  // var js = gulp.src("src/**/*.js")
  //   .pipe(sourcemaps.init())
  //   .pipe(babel())
  //   .pipe(concat("dependencies.js"))
  //   .pipe(sourcemaps.write("."))
  //   .pipe(gulp.dest("public/js"))

  gulp.src('./src/*.pegjs')
    .pipe(sourcemaps.init())
    .pipe( peg({exportVar:'erjs'}).on( "error", gutil.log ) )
    .pipe(sourcemaps.write("."))
    .pipe( gulp.dest( "build/js" ) )


  gulp.src('./src/*.coffee')
    .pipe(sourcemaps.init())
    .pipe(coffee({bare: true}).on('error', gutil.log))
    // .pipe(concat("app.js"))
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest("build/js"))
});



// var gulp = require('gulp');
// var sourcemaps = require('gulp-sourcemaps');
// var source = require('vinyl-source-stream');
// var buffer = require('vinyl-buffer');
// var browserify = require('browserify');
// var watchify = require('watchify');
// var babel = require('babelify');

// function compile(watch) {
//   var bundler = watchify(browserify('./src/app.js', { debug: true }).transform(babel));

//   function rebundle() {
//     bundler.bundle()
//       .on('error', function(err) { console.error(err); this.emit('end'); })
//       .pipe(source('build.js'))
//       .pipe(buffer())
//       .pipe(sourcemaps.init({ loadMaps: true }))
//       .pipe(sourcemaps.write('./'))
//       .pipe(gulp.dest('./public/js'));
//   }

//   if (watch) {
//     bundler.on('update', function() {
//       console.log('-> bundling...');
//       rebundle();
//     });
//   }

//   rebundle();
// }



// function watch() {
//   return compile(true);
// };

// gulp.task('build', function() { return compile(); });
// gulp.task('watch', function() { return watch(); });

// gulp.task('default', ['build']);
