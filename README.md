# AngularJS Tree View Directive

File-explorer-like Tree view control for AngularJS and Bootstrap.

## Using the Tree View

In your HTML:

```HTML
<div tree-view="structure" tree-view-options="options"></div>
```

Where structure is the JSON model containing the folders and files, and options is the tree view configuration. If you don’t provide any, the default configuration is used.

Example model and configuration:

```JS
$scope.structure = { folders: [
    { name: 'Folder 1', files: [{ name: 'File 1.jpg' }, { name: 'File 2.png' }], folders: [
        { name: 'Subfolder 1', files: [{ name: 'Subfile 1' }] },
        { name: 'Subfolder 2' },
        { name: 'Subfolder 3' }
    ]},
    { name: 'Folder 2' }
]};

$scope.options = {
    onNodeSelect: function (node, breadcrums) {
        $scope.breadcrums = breadcrums;
    }
};
```