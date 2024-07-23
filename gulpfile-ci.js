var gulp = require("gulp");
var msbuild = require("gulp-msbuild");
var debug = require("gulp-debug");
var foreach = require("gulp-foreach");
var rename = require("gulp-rename");
var newer = require("gulp-newer");
var util = require("gulp-util");
var runSequence = require("run-sequence");
var nugetRestore = require('gulp-nuget-restore');
var fs = require('fs');
var yargs = require("yargs").argv;
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');
var cleanCSS = require('gulp-clean-css');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

//Validate Solution
var path = require("path");
var rimrafDir = require("rimraf");
var rimraf = require("gulp-rimraf");

var config;
if (fs.existsSync('./gulp-config.js.user')) {
    config = require("./gulp-config.js.user")();
}
else {
    config = require("./gulp-config.js")()
}
module.exports.config = config;

/*****************************
  CSS
*****************************/
var sassOptions = {
    includePaths: ['src/Foundation/Theme/website/'],
    outputStyle: 'expanded'
};

var prefixerOptions = {
    browsers: ['last 2 versions']
};

gulp.task("Compile-Sass", function () {
    return gulp.src(config.scssLocation + '/*.scss')
        .pipe(sass(sassOptions))
        .pipe(autoprefixer(prefixerOptions))
        .pipe(gulp.dest(config.scssLocation))
        .pipe(cleanCSS())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest(config.scssLocation));
});

gulp.task("Compile-JS", function () {
    return gulp.src(config.jsFiles)
        .pipe(concat('bundle.js'))
        .pipe(gulp.dest(config.jsLocation))
        .pipe(uglify())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest(config.jsLocation));
});

/*****************************
  Publish
*****************************/
var publishStream = function (stream, dest) {
    var targets = ["Build"];

    return stream
        .pipe(debug({ title: "Building project:" }))
        .pipe(msbuild({
            targets: targets,
            configuration: 'Release',
            logCommand: false,
            verbosity: config.buildVerbosity,
            stdout: true,
            errorOnFail: true,
            maxcpucount: config.buildMaxCpuCount,
            nodeReuse: false,
            toolsVersion: config.buildToolsVersion,
            properties: {
                Platform: config.publishPlatform,
                DeployOnBuild: "true",
                DeployDefaultTarget: "WebPublish",
                WebPublishMethod: "FileSystem",
                DeleteExistingFiles: "false",
                publishUrl: dest,
                _FindDependencies: "false"
            }
        }));
};

var publishProject = function (location, dest) {
    dest = dest || config.websiteRoot;

    console.log("publish to " + dest + " folder");
    return gulp.src(["./src/" + location + "/website/*.csproj"])
        .pipe(foreach(function (stream, file) {
            return publishStream(stream, dest);
        }));
};

var publishProjects = function (location, dest) {
  dest = dest || config.websiteRoot;

  console.log("publish to " + dest + " folder");
    return gulp.src([location + "/**/website/*.csproj"])
    .pipe(foreach(function (stream, file) {
      return publishStream(stream, dest);
    }));
};

gulp.task("Build-Solution", function () {
  var targets = ["Build"];
  if (config.runCleanBuilds) {
    targets = ["Clean", "Build"];
  }

  var solution = "./" + config.solutionName + ".sln";
  return gulp.src(solution)
      .pipe(msbuild({
          targets: targets,
          configuration: 'Release',
          logCommand: false,
          verbosity: config.buildVerbosity,
          stdout: true,
          errorOnFail: true,
          maxcpucount: config.buildMaxCpuCount,
          nodeReuse: false,
          toolsVersion: config.buildToolsVersion,
          properties: {
            Platform: config.buildPlatform
          }
        }));
});

gulp.task("Publish-Foundation-Projects", function () {
  return publishProjects("./src/Foundation");
});

gulp.task("Publish-Feature-Projects", function () {
  return publishProjects("./src/Feature");
});

gulp.task("Publish-Project-Projects", function () {
  return publishProjects("./src/Project");
});

gulp.task("Publish-Project", function () {
  if(yargs && yargs.m && typeof(yargs.m) == 'string') {
    return publishProject(yargs.m);
  } else {
    throw "\n\n------\n USAGE: -m Layer/Module \n------\n\n";
  }
});

gulp.task("Publish-All-Projects", function (callback) {
    return runSequence(
        "Compile-Sass",
        "Compile-JS",
        "Build-Solution",
        "Publish-Foundation-Projects",
        "Publish-Feature-Projects",
        "Publish-Project-Projects", callback);
});
/*
 * Build
 */

gulp.task("CI-Build", function (callback) {
    runSequence(
        "CI-Clean",
        "CI-Publish",
        "CI-Prepare-Package-Files",
        "CI-Copy-Items",
        callback);
});

gulp.task("CI-Publish", function (callback) {
    config.websiteRoot = path.resolve("./Output");
    config.buildConfiguration = "Release";
    fs.mkdirSync(config.websiteRoot);
    runSequence(
        "Compile-Sass",
        "Compile-JS",
        "Build-Solution",
        "Publish-Foundation-Projects",
        "Publish-Feature-Projects",
        "Publish-Project-Projects", callback);
});

gulp.task("CI-Clean", function (callback) {
    rimrafDir.sync(path.resolve("./Output"));
    callback();
});

gulp.task("CI-Prepare-Package-Files", function (callback) {
    var excludeList = [
        config.websiteRoot + "\\bin\\roslyn\\",
        config.websiteRoot + "\\bin\\App_Config\\",
        config.websiteRoot + "\\bin\\{Sitecore,Lucene,Newtonsoft,System,Microsoft.Web.Infrastructure}*dll",
        config.websiteRoot + "\\compilerconfig.json.defaults",
        config.websiteRoot + "\\packages.config",
        config.websiteRoot + "\\web.config.transform",
        config.websiteRoot + "\\Web.Debug.config",
        config.websiteRoot + "\\Web.Release.config",
        config.websiteRoot + "\\App_Config\\Include\\Unicorn\\*.DataProvider.config",
        //config.websiteRoot + "\\App_Config\\Include\\{Feature,Foundation,Project}\\z.*DevSettings.config",
        config.websiteRoot + "\\App_Config\\Include\\z.EB.DevSettings.config",
        config.websiteRoot + "\\Assets\\Styling\\modules\\",
        config.websiteRoot + "\\Assets\\Styling\\partials\\",
        config.websiteRoot + "\\Assets\\Styling\\*.scss",
        //config.websiteRoot + "\\Styling\\*.css",
        //config.websiteRoot + "\\package.json",
        //config.websiteRoot + "\\bundleconfig.json",
        //"!" + config.websiteRoot + "\\Assets\\Styling\\*.min.css",
        "!" + config.websiteRoot + "\\bin\\Sitecore.Support*dll",
        "!" + config.websiteRoot + "\\bin\\Sitecore.{Feature,Foundation,Habitat,Demo,Common}*dll"
    ];
    console.log(excludeList);

    return gulp.src(excludeList, { read: false }).pipe(rimraf({ force: true }));
});

gulp.task("CI-Copy-Items", function () {
    return gulp.src("./src/**/serialization/**/*.yml")
        .pipe(gulp.dest(config.websiteRoot + '//App_Data//unicorn//'));
});