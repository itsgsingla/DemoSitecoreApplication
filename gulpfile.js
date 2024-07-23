/// <binding />
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
var unicorn = require("./scripts/unicorn.js");
var EbConf = require("./scripts/EbConf.js");
var helix = require("./scripts/helix.js");
var validate = require("./scripts/validate.js");
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');
var cleanCSS = require('gulp-clean-css');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

//Validate Solution
var watch = require("gulp-watch");
var merge = require("merge-stream");
var path = require("path");

var config;
if (fs.existsSync('./gulp-config.js.user')) {
    config = require("./gulp-config.js.user")();
}
else {
    config = require("./gulp-config.js")()
}

module.exports.config = config;

gulp.task("00-Validate-Solution", function (callback) {
    return runSequence(
        "Validate-Solution", callback);
});

gulp.task("Validate-Solution", function (callback) {
    var options = {};
    options.solution = config.websiteRoot + "/" + config.solutionName + ".sln";

    validate(function () { return callback() }, options);
});

helix.header("Element Blue", "");

gulp.task("default", function (callback) {
  config.runCleanBuilds = true;
  return runSequence(
    "01-Copy-Sitecore-License",
    "02-Nuget-Restore",
    "03-Publish-All-Projects",  
	callback);
});

gulp.task("deploy", function (callback) {
  config.runCleanBuilds = true;
  return runSequence(
    "01-Copy-Sitecore-License",
    "02-Nuget-Restore",
    "03-Publish-All-Projects",    
	callback);
});

/*****************************
  Initial setup
*****************************/
gulp.task("01-Copy-Sitecore-License", function () {
  console.log("Copying Sitecore License file");

  return gulp.src(config.licensePath).pipe(gulp.dest("./lib"));
});

gulp.task("02-Nuget-Restore", function (callback) {
  var solution = "./" + config.solutionName + ".sln";
  return gulp.src(solution).pipe(nugetRestore());
});


gulp.task("03-Publish-All-Projects", function (callback) {
  return runSequence(
    "Build-Solution",
    "Publish-Foundation-Projects",
    "Publish-Feature-Projects",
    "Publish-Project-Projects", callback);
});

gulp.task("04-Apply-Xml-Transform", function () {
  var layerPathFilters = ["./src/Foundation/**/*.transform", "./src/Feature/**/*.transform", "./src/Project/**/*.transform", "!./src/**/obj/**/*.transform", "!./src/**/bin/**/*.transform"];
  return gulp.src(layerPathFilters)
    .pipe(foreach(function (stream, file) {
      var fileToTransform = file.path.replace(/.+website\\(.+)\.transform/, "$1");
      util.log("Applying configuration transform: " + file.path);
      return gulp.src("./scripts/applytransform.targets")
        .pipe(msbuild({
          targets: ["ApplyTransform"],
          configuration: config.buildConfiguration,
          logCommand: false,
          verbosity: config.buildVerbosity,
          stdout: true,
          errorOnFail: true,
          maxcpucount: config.buildMaxCpuCount,
          nodeReuse: false,
          toolsVersion: config.buildToolsVersion,
          properties: {
            Platform: config.buildPlatform,
            WebConfigToTransform: config.websiteRoot,
            TransformFile: file.path,
            FileToTransform: fileToTransform
          }
        }));
    }));
});
  

/*****************************
  Copy assemblies to all local projects
*****************************/
gulp.task("Copy-Local-Assemblies", function () {
  console.log("Copying site assemblies to all local projects");
  var files = config.sitecoreLibraries + "/**/*";

  var root = "./src";
  var projects = root + "/**/code/bin";
  return gulp.src(projects, { base: root })
    .pipe(foreach(function (stream, file) {
      console.log("copying to " + file.path);
      gulp.src(files)
        .pipe(gulp.dest(file.path));
      return stream;
    }));
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
      configuration: config.buildConfiguration,
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
}

var publishProject = function (location, dest) {
  dest = dest || config.websiteRoot;

  console.log("publish to " + dest + " folder");
  return gulp.src(["./src/" + location + "/code/*.csproj"])
    .pipe(foreach(function (stream, file) {
      return publishStream(stream, dest);
    }));
}

var publishProjects = function (location, dest) {
  dest = dest || config.websiteRoot;

  console.log("publish to " + dest + " folder");
  return gulp.src([location + "/**/code/*.csproj"])
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
          configuration: config.buildConfiguration,
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

gulp.task("Publish-Assemblies", function () {
  var root = "./src";
    var binFiles = root + "/**/website/**/bin/" + config.solutionName + ".{Feature,Foundation,Project}.*.{dll,pdb}";
  var destination = config.websiteRoot + "/bin/";
  return gulp.src(binFiles, { base: root })
    .pipe(rename({ dirname: "" }))
    .pipe(newer(destination))
    .pipe(debug({ title: "Copying " }))
    .pipe(gulp.dest(destination));
});

gulp.task("Publish-All-Views", function () {
  var root = "./src";
  var roots = [root + "/**/Views", "!" + root + "/**/obj/**/Views"];
  var files = "/**/*.cshtml";
  var destination = config.websiteRoot + "\\Views";
  return gulp.src(roots, { base: root }).pipe(
    foreach(function (stream, file) {
      console.log("Publishing from " + file.path);
      gulp.src(file.path + files, { base: file.path })
        .pipe(newer(destination))
        .pipe(debug({ title: "Copying " }))
        .pipe(gulp.dest(destination));
      return stream;
    })
  );
});


gulp.task("Publish-Html5-Gallery", function () {
    var root = "./src";
    var roots = [root + "/**/scripts/"];
    var files = "/**/skins/**/*.*";
    var destination = config.websiteRoot + "\\Assets\\Scripts";
    return gulp.src(roots, { base: root }).pipe(
        foreach(function (stream, file) {
            console.log("Publishing from " + file.path);
            gulp.src(file.path + files, { base: file.path })
                .pipe(newer(destination))
                .pipe(debug({ title: "Copying " }))
                .pipe(gulp.dest(destination));
            return stream;
        })
    );
});


gulp.task("Publish-All-Configs", function () {
  var root = "./src";
  var roots = [root + "/**/App_Config", "!" + root + "/**/obj/**/App_Config"];
  var files = "/**/*.config";
  var destination = config.websiteRoot + "\\App_Config";
  return gulp.src(roots, { base: root }).pipe(
    foreach(function (stream, file) {
      console.log("Publishing from " + file.path);
      gulp.src(file.path + files, { base: file.path })
        .pipe(newer(destination))
        .pipe(debug({ title: "Copying " }))
        .pipe(gulp.dest(destination));
      return stream;
    })
  );
});


/*****************************
 Package
*****************************/
var websiteRootBackup = config.websiteRoot;
var path = require("path");
var rimrafDir = require("rimraf");
var rimraf = require("gulp-rimraf");
var xmlpoke = require("xmlpoke");

/* publish files to temp location */
gulp.task("Package-Publish", function (callback) {
    config.websiteRoot = path.resolve("./temp");
    config.buildConfiguration = "Release";
    fs.mkdirSync(config.websiteRoot);
    runSequence(
      "Build-Solution",
      "Publish-Foundation-Projects",
      "Publish-Feature-Projects",
      "Publish-Project-Projects", callback);
});

/* Remove unwanted files */
gulp.task("Package-Prepare-Package-Files", function (callback) {
    var excludeList = [
      config.websiteRoot + "\\bin\\{Sitecore,Lucene,Newtonsoft,System,Microsoft.Web.Infrastructure}*dll",
      config.websiteRoot + "\\compilerconfig.json.defaults",
      config.websiteRoot + "\\packages.config",
      config.websiteRoot + "\\App_Config\\Include\\{Feature,Foundation,Project}\\*Serialization.config",
      config.websiteRoot + "\\App_Config\\Include\\{Feature,Foundation,Project}\\z.*DevSettings.config",
      "!" + config.websiteRoot + "\\bin\\Sitecore.Support*dll",
      "!" + config.websiteRoot + "\\bin\\Sitecore.{Feature,Foundation,Project}*dll"
    ];
    console.log(excludeList);

    return gulp.src(excludeList, { read: false }).pipe(rimraf({ force: true }));
});

/* Add files to package definition */
gulp.task("Package-Enumerate-Files", function () {
    var packageFiles = [];
    config.websiteRoot = websiteRootBackup;

    return gulp.src(path.resolve("./temp") + "/**/*.*", { base: "temp", read: false })
      .pipe(foreach(function (stream, file) {
          var item = "/" + file.relative.replace(/\\/g, "/");
          console.log("Added to the package:" + item);
          packageFiles.push(item);
          return stream;
      })).pipe(util.buffer(function () {
          xmlpoke("./package.xml", function (xml) {
              for (var idx in packageFiles) {
                  xml.add("project/Sources/xfiles/Entries/x-item", packageFiles[idx]);
              }
          });
      }));
});

/* Add items to package definition */
gulp.task("Package-Enumerate-Items", function () {
    var itemPaths = [];
    var allowedPatterns = [
      "./src/**/serialization/**/*.yml",
      "!./src/**/serialization/Roles/**/*.yml",
      "!./src/**/serialization/Users/**/*.yml"
    ];
    return gulp.src(allowedPatterns)
        .pipe(foreach(function (stream, file) {
        console.log(file);
            var itemPath = unicorn.getFullItemPath(file);
            itemPaths.push(itemPath);
            return stream;
        })).pipe(util.buffer(function () {
            xmlpoke("./package.xml", function (xml) {
                for (var idx in itemPaths) {
                    xml.add("project/Sources/xitems/Entries/x-item", itemPaths[idx]);
                }
            });
        }));
});

/* Add users to package definition */
gulp.task("Package-Enumerate-Users", function () {
    var users = [];

    return gulp.src("./src/**/serialization/Users/**/*.yml")
        .pipe(foreach(function (stream, file) {
          console.log(file);
            var fileContent = file.contents.toString();
            var userName = unicorn.getUserPath(file);
            users.push(userName);
            return stream;
        })).pipe(util.buffer(function () {
            xmlpoke("./package.xml", function (xml) {
                for (var idx in users) {
                    xml.add("project/Sources/accounts/Entries/x-item", users[idx]);
                }
            });
        }));
});

/* Add roles to package definition */
gulp.task("Package-Enumerate-Roles", function () {
    var roles = [];

    return gulp.src("./src/**/serialization/Roles/**/*.yml")
        .pipe(foreach(function (stream, file) {
          console.log(file);
            var fileContent = file.contents.toString();
            var roleName = unicorn.getRolePath(file);            
            roles.push(roleName);
            return stream;
        })).pipe(util.buffer(function () {
            xmlpoke("./package.xml", function (xml) {
                for (var idx in roles) {
                    xml.add("project/Sources/accounts/Entries/x-item", roles[idx]);
                }
            });
        }));
});

/* Remove temp files */
gulp.task("Package-Clean", function (callback) {
    rimrafDir.sync(path.resolve("./temp"));
    callback();
});

/* Main task, generate package.xml */
gulp.task("Package-Generate", function (callback) {
    runSequence(
        "Package-Clean",
        "Package-Publish",
        "Package-Prepare-Package-Files",
        "Package-Enumerate-Files",
        "Package-Enumerate-Items",
        "Package-Enumerate-Users",
        "Package-Enumerate-Roles",
        "Package-Clean",
        callback);
});