define(['angular', 'marked', 'hljs','tabIndent'], function(angular, marked, hljs,tabIndent) {

    return angular.module('editor', [])
        .directive('editorBox',[
            function () {
                return {
                    restrict: "A",
                    replace:true,
                    template: "<textarea></textarea>",
                    link: function (scope,element,attr) {
                        tabIndent.config.tab = "    ";
                        tabIndent.render(element[0]);
                    }
                }
            }
        ])
        .controller('EditorController', [
            '$scope',
            '$sce',
            function($scope, $sce) {

                marked.setOptions({
                    renderer: new marked.Renderer(),
                    gfm: true,
                    tables: true,
                    breaks: false,
                    pedantic: false,
                    sanitize: false,
                    smartLists: true,
                    smartypants: false,
                    highlight: function(code) {
                        return hljs.highlightAuto(code).value;
                    }
                });

                $scope.contentText = "";

                $scope.$watch('contentText', function(val) {
                    val = marked(val);
                    $scope.previewHTML = $sce.trustAsHtml(val);
                });

                $scope.showMdSyntax = function () {

                };
                
                $scope.save = function(){
                    
                }
            }
        ])

});
