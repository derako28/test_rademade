'use strict';

const gulp = require('gulp'),
    watch = require('gulp-watch'),
    prefixer = require('gulp-autoprefixer'),
    uglify = require('gulp-uglify'),
    sass = require('gulp-sass'),
    sourcemaps = require('gulp-sourcemaps'),
    rigger = require('gulp-rigger'),
    cleanCSS = require('gulp-clean-css'),
    imagemin = require('gulp-imagemin'),
    pngquant = require('imagemin-pngquant'),
    rimraf = require('rimraf'),
    browserSync = require("browser-sync"),
    reload = browserSync.reload,
    pug = require('gulp-pug'),

    browserify = require('browserify'),
    babel = require('babelify'),
    vinylSourceStream = require('vinyl-source-stream'),
    es = require('event-stream'),
    notify = require("gulp-notify"),
    eslint = require('gulp-eslint'),
    $ = require('gulp-load-plugins')();


const path = {
    build: { //Тут мы укажем куда складывать готовые после сборки файлы
        html: 'build/',
        js: 'build/assets/js/',
        css: 'build/assets/css/',
        img: 'build/assets/img/',
        fonts: 'build/assets/fonts/',
        libs: 'build/libs/',
        pug: 'build/',
    },
    src: { //Пути откуда брать исходники
        html: 'src/*.html', //Синтаксис src/*.html говорит gulp что мы хотим взять все файлы с расширением .html
        js: 'src/assets/js/**/*.js', //В стилях и скриптах нам понадобятся только main файлы
        style: 'src/assets/sass/**/*.{scss,sass}',
        img: 'src/assets/img/**/*.*', //Синтаксис img/**/*.* означает - взять все файлы всех расширений из папки и из вложенных каталогов
        fonts: 'src/assets/fonts/**/*.*',
        libs: 'src/libs/**/*.*',
        pug: ['src/pug/*.pug', 'src/pug/pages/*.pug'],

    },
    watch: { //Тут мы укажем, за изменением каких файлов мы хотим наблюдать
        html: 'src/**/*.html',
        pug: 'src/**/*.pug',
        js: 'src/assets/js/**/*.js',
        style: 'src/assets/sass/**/*.{scss,sass}',
        fonts: 'src/assets/fonts/**/*.*',
    },
    clean: './build'
};

const config = {
    server: {
        baseDir: "./build"
    },
    tunnel: true,
    host: 'localhost',
    port: 3000,
    logPrefix: "Frontend"
};

gulp.task('html:build', function() {
    gulp.src(path.src.html) //Выберем файлы по нужному пути
        .pipe(rigger()) //Прогоним через rigger
        .pipe(gulp.dest(path.build.html)) //Выплюнем их в папку build
        .pipe(browserSync.reload({ stream: true })); //И перезагрузим наш сервер для обновлений
});

gulp.task('pug', function () {
    gulp.src(path.src.pug)
        .pipe(pug({
            pretty: true
        }).on("error", notify.onError({
            message: "Error: <%= error.message %>",
            title: "Pug error"
        })))
        .pipe(gulp.dest(path.build.pug))
        .pipe(browserSync.reload({stream: true}));
});

gulp.task('js:build', () =>
    gulp.src(path.src.js)

        .pipe(uglify()) //Сожмем наш js
        .pipe(gulp.dest(path.build.js))
        .pipe(reload({stream: true}))
);

gulp.task('browserify', function () {
    const files = [
        'common.js'
    ];
    const tasks = files.map(function (entry) {
        return browserify({
            entries: ['src/assets/js/' + entry],
            debug: true
        })
            .transform(babel)
            .bundle().on("error", notify.onError({
                message: "Error: <%= error.message %>",
                title: "Js error"
            }))
            .pipe(vinylSourceStream(entry))
            .pipe(gulp.dest(path.build.js))
            .pipe(browserSync.stream({once: true}));
    });
    return es.merge.apply(null, tasks);
});

gulp.task('lint', () => {
    return gulp.src(path.src.js)
        .pipe(eslint({
            rules: {
                'my-custom-rule': 1,
                'strict': 2
            },
            globals: [
                'jQuery',
                '$'
            ],
            envs: [
                'browser'
            ]
        }))
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});


gulp.task('image:build', function () {
    gulp.src(path.src.img) //Выберем наши картинки
        .pipe(imagemin({ //Сожмем их
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngquant()],
            interlaced: true
        }))
        .pipe(gulp.dest(path.build.img)) //И бросим в build
        .pipe(reload({stream: true}));
});


gulp.task('style:build', function () {
    gulp.src(path.src.style) //Выберем наш main.scss
        .pipe(sourcemaps.init()) //То же самое что и с js
        .pipe(sass().on("error", notify.onError({
            message: "Error: <%= error.message %>",
            title: "Sass error"
        }))) //Скомпилируем
        .pipe(prefixer(['last 4 versions'])) //Добавим вендорные префиксы
        .pipe(cleanCSS())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(path.build.css)) //И в build
        .pipe(reload({stream: true}));
});

gulp.task('libs:build', function () {
    gulp.src(path.src.libs)
        .pipe(gulp.dest(path.build.libs));
});

gulp.task('fonts:build', function () {
    gulp.src(path.src.fonts)
        .pipe(gulp.dest(path.build.fonts))
});

gulp.task('build', [
    'html:build',
    'js:build',
    'browserify',
    'style:build',
    'fonts:build',
    'image:build',
    'libs:build',
    'pug'
]);

gulp.task('watch', function () {
    watch([path.watch.html], function(event, cb) {
        gulp.start('html:build');
    });
    watch([path.watch.pug], function (event, cb) {
        gulp.start('pug');
    });
    watch([path.watch.js], function (event, cb) {
        gulp.start('js:build');
    });
    watch([path.watch.style], function (event, cb) {
        gulp.start('style:build');
    });
    watch([path.watch.js], function (event, cb) {
        gulp.start('browserify');
    });
    watch([path.watch.img], function (event, cb) {
        gulp.start('image:build');
    });
    watch([path.watch.fonts], function (event, cb) {
        gulp.start('fonts:build');
    });
});

gulp.task('webserver', function () {
    browserSync(config);
});

gulp.task('clean', function (cb) {
    rimraf(path.clean, cb);
});

gulp.task('default', ['build', 'webserver', 'watch']);