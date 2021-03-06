(function() {
    'use strict';
    angular.module('theHiveDirectives').directive('dashboardItem', function(DashboardSrv, UserSrv, $uibModal, $timeout, $q) {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                rowIndex: '=',
                colIndex: '=',
                component: '=',
                metadata: '=',
                filter: '=?',
                autoload: '=',
                refreshOn: '@',
                resizeOn: '@',
                mode: '@',
                showEdit: '=',
                showRemove: '=',
                onRemove: '&'
            },
            templateUrl: 'views/directives/dashboard/item.html',
            link: function(scope, element) {
                scope.typeClasses = DashboardSrv.typeClasses;
                scope.timeIntervals = DashboardSrv.timeIntervals;
                scope.aggregations = DashboardSrv.aggregations;
                scope.serieTypes = DashboardSrv.serieTypes;
                scope.sortOptions = DashboardSrv.sortOptions;

                scope.layout = {
                    activeTab: 0
                };
                scope.query = null;
                scope.skipFields = function(fields, types) {
                    return _.filter(fields, function(item) {
                        return types.indexOf(item.type) === -1;
                    });
                };

                scope.pickFields = function(fields, types) {
                    return _.filter(fields, function(item) {
                        return types.indexOf(item.type) !== -1;
                    });
                }

                scope.fieldsForAggregation = function(fields, agg) {                    
                    if(agg === 'count') {
                        return [];
                    } else if(agg === 'sum' || agg === 'avg') {
                        return scope.pickFields(fields, ['number']);
                    } else {
                        return fields;
                    }
                }

                if(scope.component.id) {
                    scope.$on('edit-chart-' + scope.component.id, function(data) {
                        scope.editItem();
                    });
                }

                scope.editItem = function() {
                    var modalInstance = $uibModal.open({
                        scope: scope,
                        controller: ['$scope', '$uibModalInstance', function($scope, $uibModalInstance) {
                            $scope.cancel = function() {
                                $uibModalInstance.dismiss();
                            };

                            $scope.save = function() {
                                $uibModalInstance.close($scope.component.options);
                            };
                        }],
                        templateUrl: 'views/directives/dashboard/edit.dialog.html',
                        size: 'lg'
                    });

                    modalInstance.result.then(function(definition) {
                        var entity = scope.component.options.entity;

                        if(!entity) {
                            return;
                        }

                        // Set the computed query
                        definition.query = DashboardSrv.buildFiltersQuery(scope.metadata[entity].attributes, scope.component.options.filters);

                        // Set the computed querie of series if available
                        _.each(definition.series, function(serie) {
                            if(serie.filters) {
                                serie.query = DashboardSrv.buildFiltersQuery(scope.metadata[entity].attributes, serie.filters);
                            }
                        })

                        scope.component.options = definition;

                        $timeout(function() {
                            scope.$broadcast(scope.refreshOn, scope.filter);
                        }, 500);
                    });
                };

                scope.editorFor = function(filter) {
                    if (filter.type === null) {
                        return;
                    }
                    var field = scope.metadata[scope.component.options.entity].attributes[filter.field];
                    var type = field.type;

                    if ((type === 'string' || type === 'number') && field.values.length > 0) {
                        return 'enumeration';
                    }

                    return filter.type;
                };

                scope.promiseFor = function(filter, query) {
                    var field = scope.metadata[scope.component.options.entity].attributes[filter.field];

                    var promise = null;

                    if(field.type === 'user') {
                        promise = UserSrv.autoComplete(query);
                    } else if (field.values.length > 0) {
                        promise = $q.resolve(
                            _.map(field.values, function(item, index) {
                                return {
                                    text: item,
                                    label: field.labels[index] || item
                                };
                            })
                        );
                    } else {
                        promise = $q.resolve([]);
                    }

                    return promise.then(function(response) {
                        var list = [];

                        list = _.filter(response, function(item) {
                            var regex = new RegExp(query, 'gi');
                            return regex.test(item.label);
                        });

                        return $q.resolve(list);
                    });
                };

                scope.addFilter = function() {
                    scope.component.options.filters = scope.component.options.filters || [];

                    scope.component.options.filters.push({
                        field: null,
                        type: null
                    });
                };

                scope.removeFilter = function(index) {
                    scope.component.options.filters.splice(index, 1);
                };

                scope.setFilterField = function(filter) {
                    var entity = scope.component.options.entity;
                    var field = scope.metadata[entity].attributes[filter.field];

                    filter.type = field.type;

                    if (field.type === 'date') {
                        filter.value = {
                            from: null,
                            to: null
                        };
                    } else {
                        filter.value = null;
                    }
                };

                scope.addSerie = function() {
                    scope.component.options.series = scope.component.options.series || [];

                    scope.component.options.series.push({
                        agg: null,
                        field: null
                    });
                };

                scope.addSerieFilter = function(serie) {
                    serie.filters = serie.filters || [];

                    serie.filters.push({
                        field: null,
                        type: null
                    });
                };

                scope.removeSerieFilter = function(serie, index) {
                    serie.filters.splice(index, 1);
                };


                scope.removeSerie = function(index) {
                    scope.component.options.series.splice(index, 1);
                };

                scope.showQuery = function() {
                    scope.query = DashboardSrv.buildFiltersQuery(scope.metadata[scope.component.options.entity], scope.component.options.filters);
                };
            }
        };
    });
})();
