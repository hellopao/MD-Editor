requirejs.config({
    baseUrl: "./scripts/",
    paths: {
        angular: "vendors/angular/angular",
        hljs: "vendors/highlightjs/highlight.pack",
        marked: "vendors/marked/lib/marked",
        tabIndent: "vendors/tabIndent.js/js/tabIndent"
    },
    shim: {
        angular: {
            exports: "angular"
        },
        hljs: {
            exports: "hljs"
        },
        marked: {
            exports: "marked"
        },
        tabIndent: {
            exports: "tabIndent"
        }
    }
});

requirejs(['angular','app'],function (angular,app) {
    angular.element(document).ready(function(){
		angular.bootstrap(document,[app.name]);
	});
});
