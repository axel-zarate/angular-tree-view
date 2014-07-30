(function (angular, undefined) {
	var module = angular.module('AxelSoft', []);

	module.value('treeViewDefaults', {
		foldersProperty: 'folders',
		filesProperty: 'files',
		displayProperty: 'name',
		collapsible: true
	});
	
	module.directive('treeView', ['treeViewDefaults', function (treeViewDefaults) {
		return {
			restrict: 'A',
			scope: {
				treeView: '=treeView',
				treeViewOptions: '=treeViewOptions'
			},
			replace: true,
			template:
				'<div class="tree">' +
					'<div tree-view-node="treeView">' +
					'</div>' +
				'</div>',
			controller: ['$scope', function ($scope) {
				var self = this,
					selectedNode,
					selectedFile,
				    editingNode;

				var options = angular.extend({}, treeViewDefaults, $scope.treeViewOptions);

				self.selectNode = function (node, breadcrumbs) {
					if (selectedNode) {
						selectedNode.selected = false;
					}
					if (selectedFile) {
						selectedFile.selected = false;
						selectedFile = undefined;
					}
					selectedNode = node;
					selectedNode.selected = true;

					if (typeof options.onNodeSelect === "function") {
						options.onNodeSelect(node, breadcrumbs);
					}
				};

				self.selectFile = function (file, breadcrumbs) {
					if (selectedNode) {
						selectedNode.selected = false;
						selectedNode = undefined;
					}
					if (selectedFile) {
						selectedFile.selected = false;
					}
					selectedFile = file;
					selectedFile.selected = true;

					if (typeof options.onNodeSelect === "function") {
						options.onNodeSelect(file, breadcrumbs);
					}
				};

				self.addNode = function (event, name, parent) {
					if (typeof options.onAddNode === "function") {
						options.onAddNode(event, name, parent);
					}
				};
				self.removeNode = function (node, index, parent) {
					if (typeof options.onRemoveNode === "function") {
						options.onRemoveNode(node, index, parent);
					}
				};
				
				self.renameNode = function (event, node, name) {
					if (typeof options.onRenameNode === "function") {
						return options.onRenameNode(event, node, name);
					}
					return true;
				};
				
				self.getOptions = function () {
					return options;
				};
			}]
		};
	}]);

	module.directive('treeViewNode', ['$compile', function ($compile) {
		return {
			restrict: 'A',
			require: '^treeView',
			link: function (scope, element, attrs, controller) {
				//scope.$watch(attrs.treeViewNode, render);

				var options = controller.getOptions(),
					foldersProperty = options.foldersProperty,
					filesProperty = options.filesProperty,
					displayProperty = options.displayProperty,
					collapsible = options.collapsible,
					isEditing = false;

				scope.newNodeName = '';
				scope.addErrorMessage = '';
				scope.expanded = collapsible == false;
				scope.editName = '';
				scope.editErrorMessage = '';

				scope.getIconClass = function () {
					return 'icon-folder' + (scope.expanded && scope.hasChildren() ? '-open' : '');
				};

				scope.isEditing = function () {
					return isEditing;
				};

				scope.hasChildren = function () {
					var node = scope.node;
					return Boolean(node && (node[foldersProperty] && node[foldersProperty].length) || (node[filesProperty] && node[filesProperty].length));
				};

				scope.canRemove = function () {
					return !(scope.hasChildren());
				};

				scope.selectNode = function () {
					if (isEditing) return;

					if (collapsible) {
						toggleExpanded();
					}

					var breadcrumbs = [];
					var nodeScope = scope;
					while (nodeScope.node) {
						breadcrumbs.push(nodeScope.node[displayProperty]);
						nodeScope = nodeScope.$parent;
					}
					controller.selectNode(scope.node, breadcrumbs.reverse());
				};

				scope.selectFile = function (file) {
					if (isEditing) return;

					var breadcrumbs = [file[displayProperty]];
					var nodeScope = scope;
					while (nodeScope.node) {
						breadcrumbs.push(nodeScope.node[displayProperty]);
						nodeScope = nodeScope.$parent;
					}
					controller.selectFile(file, breadcrumbs.reverse());
				};

				scope.addNode = function () {
					var addEvent = {
						commit: function (error) {
							if (error) {
								scope.addErrorMessage = error;
							}
							else {
								scope.newNodeName = '';
								scope.addErrorMessage = '';
							}
						}
					};

					controller.addNode(addEvent, scope.newNodeName, scope.node);
				};

				scope.remove = function (event, index) {
					event.stopPropagation();
					controller.removeNode(scope.node, index, scope.$parent.node);
				};

				scope.edit = function (event) {
				    isEditing = true;
				    controller.editingScope = scope;
					//expanded = false;
					scope.editName = scope.node[displayProperty];
					event.stopPropagation();
				};

				scope.canEdit = function () {
				    return !controller.editingScope || scope == controller.editingScope;
				};

				scope.canAdd = function () {
				    return !isEditing && scope.canEdit();
				};

				scope.rename = function (event) {
					event.stopPropagation();

					var renameEvent = {
						commit: function (error) {
							if (error) {
								scope.editErrorMessage = error;
							}
							else {
								scope.cancelEdit();
							}
						}
					};

					controller.renameNode(renameEvent, scope.node, scope.editName);
				};

				scope.cancelEdit = function (event) {
					if (event) {
						event.stopPropagation();
					}

					isEditing = false;
					scope.editName = '';
					scope.editErrorMessage = '';
					controller.editingScope = undefined;
				};

				function toggleExpanded() {
					//if (!scope.hasChildren()) return;
					scope.expanded = !scope.expanded;
				}

				function render() {
					var template =
						'<div class="tree-folder" ng-repeat="node in ' + attrs.treeViewNode + '.' + foldersProperty + '">' +
							'<div class="tree-folder-header inline" ng-click="selectNode()" ng-class="{ selected: node.selected }">' +
								'<i class="icon-folder-close" ng-class="getIconClass()"></i> ' +
								'<div class="tree-folder-name">{{ node.' + displayProperty + ' }}</div> ' +
							'</div>' +
							'<div class="tree-folder-content"'+ (collapsible ? ' ng-show="expanded"' : '') + '>' +
								'<div tree-view-node="node" tree-view-node-collapsible="' + collapsible + '">' +
								'</div>' +
							'</div>' +
						'</div>' +
						'<div class="tree-item" ng-repeat="file in node.' + filesProperty + '" ng-click="selectFile(file)" ng-class="{ selected: file.selected }">' +
							'<div class="tree-item-name"><i class="icon-file"></i> {{ file.' + displayProperty + ' }}</div>' +
						'</div>';

					//Rendering template.
					element.html('').append($compile(template)(scope));
				}

				render();
			}
		};
	}]);
})(angular);