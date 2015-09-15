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
				'<div class="tree-wrap">' +
					'<ul class="inline tree-actions" ng-show="showActions">' +
						'<li><a title="Add" href="#" ng-click="add($event)" ng-show="canAdd" ng-disabled="!isFolderSelected"><i class="fa fa-plus icon-plus"></i></a></li>' +
						'<li><a title="Edit" href="#" ng-click="edit($event)" ng-show="canEdit" ng-disabled="!hasSelection"><i class="fa fa-pencil icon-pencil light-orange"></i></a></li>' +
						'<li class="remove"><a title="Remove" href="#" ng-click="remove($event)" ng-show="canRemove" ng-disabled="!hasSelection"><i class="fa fa-trash icon-trash red"></i></a></li>' +
					'</ul>' +
					'<div class="tree">' +
						'<div tree-view-node="treeView">' +
						'</div>' +
					'</div>' +
				'</div>',
			controller: ['$scope', '$q', function ($scope, $q) {
				var self = this,
					selectedScope,
					selectedFolder,
					selectedFile,
					editingScope;

				var options = angular.extend({}, treeViewDefaults, $scope.treeViewOptions);

				self.selectFolder = function (scope, node, breadcrumbs) {
					if (editingScope) return;

					if (selectedFile) {
						selectedFile = undefined;
					}
					selectedScope = scope;
					selectedFolder = node;
					$scope.hasSelection = true;
					$scope.isFolderSelected = true;

					if (typeof options.onNodeSelect === "function") {
						options.onNodeSelect(node, breadcrumbs);
					}
				};

				self.selectFile = function (scope, file, breadcrumbs) {
					if (editingScope) return;

					if (selectedFolder) {
						selectedFolder = undefined;
					}
					selectedScope = scope;
					selectedFile = file;
					$scope.hasSelection = true;
					$scope.isFolderSelected = false;

					if (typeof options.onNodeSelect === "function") {
						options.onNodeSelect(file, breadcrumbs);
					}
				};

				self.isSelected = function (node) {
					return node === selectedFolder || node === selectedFile;
				};

				self.getOptions = function () {
					return options;
				};

				self.isEditable = function () {
					return editable;
				};

				self.cancelEdit = function() {
					editingScope = undefined;
					$scope.showActions = true;
				};

				self.endEdit = function(node, editName, parent) {
					$q.when(options.onEdit(node, editName, parent), function (result) {
						if (result === false) return;

						editingScope.acceptEdit();

						self.cancelEdit();
					}, function (error) {
						editingScope.setEditError(error);
					});
				};

				$scope.add = function (event) {
					event.preventDefault();

					if (!$scope.isFolderSelected) return;

					options.onAdd(selectedFolder);
				};

				$scope.remove = function (event) {
					event.preventDefault();

					if (!$scope.hasSelection) return;

					var selected = selectedFile || selectedFolder;
					$q.when(options.onRemove(selected, selectedScope.$parent.node || $scope.treeView), function (result) {
						if (result === false) return;
						selectedScope = undefined;
						selectedFolder = undefined;
						selectedFile = undefined;
						$scope.hasSelection = false;
						$scope.isFolderSelected = false;
					});
				};

				$scope.edit = function (event) {
					event.preventDefault();

					if (!$scope.hasSelection) return;

					$scope.showActions = false;
					editingScope = selectedScope;
					editingScope.beginEdit();
				};

				$scope.canAdd = typeof options.onAdd === "function";
				$scope.canEdit = typeof options.onEdit === "function";
				$scope.canRemove = typeof options.onRemove === "function";
				var editable = $scope.canAdd || $scope.canEdit || $scope.canRemove;
				$scope.showActions = editable;
			}]
		};
	}]);

	module.directive('treeViewNode', ['$compile', '$timeout', function ($compile, $timeout) {
		return {
			restrict: 'A',
			require: '^treeView',
			link: function (scope, element, attrs, controller) {

				var options = controller.getOptions(),
					foldersProperty = options.foldersProperty,
					filesProperty = options.filesProperty,
					displayProperty = options.displayProperty,
					collapsible = options.collapsible,
					editable = controller.isEditable();

				var isEditing = false,
					selectedFolder;

				scope.expanded = collapsible == false;

				scope.isEditing = function () {
					return isEditing;
				};

				scope.getFolderIconClass = function () {
					var suffix = scope.expanded && scope.hasChildren() ? '-open' : '';
					return 'icon-folder' + suffix + ' folder' + suffix;
				};

				scope.hasChildren = function () {
					var node = scope.node;
					return Boolean(node && (node[foldersProperty] && node[foldersProperty].length) || (node[filesProperty] && node[filesProperty].length));
				};

				scope.selectFolder = function (event) {
					event.preventDefault();

					if (isEditing) return;

					if (collapsible) {
						toggleExpanded();
					}

					if (scope.isSelected()) return;

					selectedFolder = event.currentTarget;
					var breadcrumbs = [];
					var nodeScope = scope;
					while (nodeScope.node) {
						breadcrumbs.push(nodeScope.node[displayProperty]);
						nodeScope = nodeScope.$parent;
					}
					controller.selectFolder(scope, scope.node, breadcrumbs.reverse());
				};

				scope.isSelected = function () {
					return controller.isSelected(scope.node);
				};

				scope.beginEdit = function () {
					isEditing = true;

					scope.editErrorMessage = '';
					scope.editName = scope.node[displayProperty];

					$timeout(function () {
						angular.element(selectedFolder).find('input.edit').focus();
					}, 50);
				};

				scope.endEdit = function (event) {
					event.preventDefault();
					event.stopPropagation();

					controller.endEdit(scope.node, scope.editName, scope.$parent.node || scope.$parent.treeView);
				};

				scope.cancelEdit = function (event) {
					event.preventDefault();
					event.stopPropagation();
					isEditing = false;
					controller.cancelEdit();
				};

				scope.acceptEdit = function () {
					isEditing = false;
				};

				scope.setEditError = function (message) {
					scope.editErrorMessage = message;
				};

				function toggleExpanded() {
					scope.expanded = !scope.expanded;
				}

				function render() {
					var template =
						'<div class="tree-folder" ng-repeat="node in ' + attrs.treeViewNode + '.' + foldersProperty + ' | orderBy: \'' + displayProperty + '\'">' +
							'<a href="#" class="tree-folder-header inline" ng-click="selectFolder($event)" ng-class="{ selected: isSelected() }">' +
								'<i class="fa fa-folder icon-folder-close" ng-class="getFolderIconClass()"></i> ' +
								'<span class="tree-folder-name"' + (editable ? ' ng-hide="isEditing()"' : '') + '>{{ node.' + displayProperty + ' }}</span> ' +
								(editable ?
								'<span class="edit-pane" ng-show="isEditing()">' +
									'<input type="text" class="input-large edit" ui-keyup="{ enter: \'endEdit($event)\', esc: \'cancelEdit($event)\' }" ng-model="editName" maxlength="60" />' +
									'<span ng-click="endEdit($event)" title="Save"><i class="fa fa-check icon-ok green"></i></span>' +
									'<span ng-click="cancelEdit($event)" title="Cancel"><i class="fa fa-remove icon-remove red"></i></span>' +
									'<span class="red help-inline">{{ editErrorMessage }}</span>' +
								'</span>'
									: '') +
							'</a>' +
							'<div class="tree-folder-content"'+ (collapsible ? ' ng-show="expanded"' : '') + '>' +
								'<div tree-view-node="node">' +
								'</div>' +
							'</div>' +
						'</div>' +
						'<a href="#" class="tree-item" tree-view-file="file" ng-repeat="file in ' + attrs.treeViewNode + '.' + filesProperty + ' | orderBy: \'' + displayProperty + '\'">' +
						'</div>';

					//Rendering template.
					element.html('').append($compile(template)(scope));
				}

				render();
			}
		};
	}]);

	module.directive('treeViewFile', ['$compile', '$timeout', function ($compile, $timeout) {
		return {
			restrict: 'A',
			require: '^treeView',
			terminal: true,
			link: function (scope, element, attrs, controller) {
				var options = controller.getOptions(),
					filesProperty = options.filesProperty,
					displayProperty = options.displayProperty,
					editable = controller.isEditable();

				var isEditing = false;

				scope.isEditing = function () {
					return isEditing;
				};

				scope.getFileIconClass = typeof options.mapIcon === 'function' 
					? options.mapIcon
					: function (file) {
						return 'fa-file icon-file';
					};

				scope.selectFile = function (event) {
					event.preventDefault();

					if (isEditing) return;
					if (scope.isSelected()) return;

					var breadcrumbs = [];
					var nodeScope = scope.$parent;
					while (nodeScope.node) {
						breadcrumbs.push(nodeScope.node[displayProperty]);
						nodeScope = nodeScope.$parent;
					}
					controller.selectFile(scope, scope.file, breadcrumbs.reverse());
				};

				scope.isSelected = function () {
					return controller.isSelected(scope.file);
				};

				scope.beginEdit = function () {
					isEditing = true;

					scope.editErrorMessage = '';
					scope.editName = scope.file[displayProperty];

					$timeout(function () {
						element.find('input.edit').focus();
					}, 50);
				};

				scope.endEdit = function (event) {
					event.preventDefault();
					event.stopPropagation();

					controller.endEdit(scope.file, scope.editName, scope.$parent.node || scope.$parent.treeView);
				};

				scope.cancelEdit = function (event) {
					event.preventDefault();
					event.stopPropagation();
					isEditing = false;
					controller.cancelEdit();
				};

				scope.acceptEdit = function () {
					isEditing = false;
				};

				scope.setEditError = function (message) {
					scope.editErrorMessage = message;
				};

				scope.$watch(scope.isSelected, function (isSelected) {
					element[isSelected ? 'addClass' : 'removeClass']('selected');
				});

				function render() {
					var template =
						//'<a href="#" class="tree-item" ng-click="selectFile($event)" ng-class="{ selected: isSelected()' + (editable ? ', editing: isEditing()' : '') + ' }">' +
							'<span class="tree-item-name"' + (editable ? ' ng-hide="isEditing()"' : '') + '><i class="fa" ng-class="getFileIconClass(file)"></i> {{ file.' + displayProperty + ' }}</span>' +
							(editable ?
								'<span class="edit-pane" ng-show="isEditing()">' +
									'<input type="text" class="input-large edit" ui-keyup="{ enter: \'endEdit($event)\', esc: \'cancelEdit($event)\' }" ng-model="editName" maxlength="60" />' +
									'<span ng-click="endEdit($event)" title="Save"><i class="fa fa-check icon-ok green"></i></span>' +
									'<span ng-click="cancelEdit($event)" title="Cancel"><i class="fa fa-remove icon-remove red"></i></span>' +
									'<span class="red help-inline">{{ editErrorMessage }}</span>' +
								'</span>'
									: '') ;
									//+
						//'</a>';

					//Rendering template.
					// var compiled = $compile(template)(scope);
					// element.replaceWith(compiled);
					element.html('').append($compile(template)(scope));
					element.bind('click', function (event) {
						scope.$apply(function () {
							scope.selectFile(event);
						});
					});
				}

				render();
			}
		};
	}]);

})(angular);