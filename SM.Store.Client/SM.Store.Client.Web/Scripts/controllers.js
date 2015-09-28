'use strict';
angular.module('smApp.controllers', ['ui.bootstrap', function () {
}])
.controller('bodyController', ['$scope', 'exDialog', '$location', function ($scope, exDialog, $location) {
    //Object variable can be accessed by all child scopes.
    $scope.body = {};

    //Dirty warning and auto closing Angular dialog within the application.
    $scope.$on('$locationChangeStart', function (event, newUrl, oldUrl) {
        if (newUrl != oldUrl)
        {
            //Dirty warning when clicking broswer navigation button or entering router matching URL.
            if ($scope.body.dirty) {
                //Use browser built-in dialog here. Any HTML template-based Angular dialog is processed after router action that has already reloaded target page. 
                if (window.confirm("Do you really want to discard data changes\nand leave the page?")) {
                    //Close any Angular dialog if opened.
                    if (exDialog.hasOpenDialog()) {
                        exDialog.closeAll();
                    }
                    //Reset flag.
                    $scope.body.dirty = false;
                }
                else {
                    //Cancel leaving action and stay on the page.
                    event.preventDefault();
                }                
            }
            else {
                //Auto close dialog if any is opened.
                if (exDialog.hasOpenDialog()) {
                    exDialog.closeAll();
                }
            }            
        }
    });

    //Dirty warning when redirecting to any external site either by clicking button or entering site URL.
    window.onbeforeunload = function (event) {
        if ($scope.body.dirty) {
            return "The page will be rediracted to another site but there is unsaved data on this page.";
        }        
    };    
}])

.controller('productListController', ['$scope', '$timeout', '$location', 'ngTableParams', 'exDialog', 'localData', 'productStatusTypes', 'productList', 'deleteProducts', function ($scope, $timeout, $location, ngTableParams, exDialog, localData, productStatusTypes, productList, deleteProducts) {
    $scope.model = {};
    $scope.model.productList = {};
    $scope.search = {};
    $scope.model.productSearchTypes = localData.getProductSearchTypes();

    $scope.model.productStatusTypes = localData.getProductStautsTypes();
    //For using database instead of local.
    //$scope.model.productStatusTypes = productStatusTypes.query({}, function (data) {
    //    //var addItem = { StatusCode: 0, Description: "Please select..." }; //Not for ajax call.
    //    //data.unshift(addItem);
    //});

    var pageSizeList = localData.getPageSizeList();

    //Default selected page size.
    var pageSizeSelectedDef = 5;

    //Paging and sorting paramters for fetching data.
    var pageIndex = 0;
    var pageSize = 0;
    var sortBy = "";
    var sortDirection = 0;

    //For keep state of sorting object.
    var sorting = {};

    //ng-table parameters and settings.
    $scope.tableParams = undefined;

    //Set search flag for bypassing non-search parameter settings.
    var nonPagerCall = false;
    //Set re-search flag for bypassing extra parameter change triggered call.
    var bypassGetData = false;
    //reloadType: 'rego' or "", 'refresh', 'add'.
    var reloadType = "";

    //Set search items for starting and reset.
    $scope.setDefaultSearchItems = function () {
        $scope.model.pSearchType = { selected: "0" };
        $scope.model.pStatusType = { selected: '0' };

        //Search parameter.
        $scope.search.pSearchText = "";
        $scope.search.pPriceLow = "";
        $scope.search.pPriceHigh = "";
        $scope.search.pAvailableFrom = "";
        $scope.search.pAvailableTo = "";

        $scope.errorMessage = undefined;
        $scope.showProductList = false;
    }
    $scope.setDefaultSearchItems();

    //Called from clicking search Go button. The getData will be called from any change of params.
    var loadProductList = function () {
        //Set default values.
        pageIndex = 0;
        pageSize = pageSizeSelectedDef;

        //Set flag for calling from non-paging components.
        nonPagerCall = true;

        //Subsequent clicking search Go button or call this function for refreshing data.
        //Mode: 're-go' (undefined), 'refresh', 'add'.
        if ($scope.tableParams != undefined) {
            if (reloadType == 'refresh') {
                //Use same existing pageIndex for refresh type.
                pageIndex = $scope.tableParams.page() - 1;                
            }
            else if (reloadType == 'add') {               
                $scope.setDefaultSearchItems();
            }
            
            //Leave same existing pageSize.
            pageSize = $scope.tableParams.count();

            //All use existing sorting.
            sorting = $scope.tableParams.sorting();

            //Set param count differently from the current to trigger getData but bypass it.
            //The actual process still use pageSize value not this changed count.
            bypassGetData = true;
            $scope.tableParams.count($scope.tableParams.count() + 1);
        }

        //Set initially ng-table parameters and this will be called first time.
        $scope.tableParams = new ngTableParams({
            page: pageIndex + 1, // Page number
            count: pageSize,     // Count per page
            sorting: sorting
        }, {
            defaultSort: 'asc',
            total: 0,
            countOptions: pageSizeList,
            countSelected: pageSize,
            //getData will also automatically be called from ng-table.js whenever params is changed.
            getData: getDataForGrid
        });
    };

    var getDataForGrid = function ($defer, params) {
        if (!bypassGetData) {
            //Reset param items when data refresh trigged by pager/sorter. 
            if (!nonPagerCall) {
                //Retrieve changed params from pager and sorter for AJAX call input            
                pageIndex = params.page() - 1;

                //Go to page #1 if change page size. 
                if (pageSize != params.count()) {
                    pageSize = params.count();
                    params.page(1);
                }
                sortBy = Object.getOwnPropertyNames(params.sorting())[0]
                //Go to page #1 if change sorting on any column.
                if (sortBy != undefined && sortBy != "") {
                    if (sorting !== params.sorting()) {
                        sorting = params.sorting();
                        sortDirection = sorting[sortBy] == "asc" ? 0 : 1;
                        params.page(1);
                    }
                }
                else {
                    sortBy = "";
                    sortDirection = 0;
                }
            }
            else {
                nonPagerCall = false;
            }
            $scope.errorMessage = undefined;

            //Below are called by all modes.
            var filterJson = getFilterJson();
            if (filterJson.error != undefined && filterJson.error != "") {
                $scope.errorMessage = filterJson.error;
            }
            else {
                //Always call this (removing else check) if non-obstructive.
                productList.post(filterJson.json, function (data) {
                    $scope.model.productList = data.Products;
                    $timeout(function () {
                        //Update table params.
                        if (reloadType == "add") {
                            params.total($scope.model.productList.length);
                            //Set for pager display.
                            params.settings().addNewLoad = true;
                        }
                        else {
                            params.total(data.TotalCount);

                            //Check if returning adjusted newPageIndex.
                            //For auto switching to previous page if last item on current page removed.
                            if (data.newPageIndex >= 0) {
                                bypassGetData = true;
                                params.page(data.newPageIndex + 1);
                                pageIndex = data.newPageIndex;
                            }                            
                            //Set params.settings().addNewLoad to false.
                            params.settings().addNewLoad = false;
                        }

                        //Set start and end page numbers for page and item info display.
                        if (pageIndex == 0) {
                            params.settings().startItemNumber = 1;
                        }
                        else {
                            params.settings().startItemNumber = pageIndex * params.settings().countSelected + 1;
                        }
                        params.settings().endItemNumber = params.settings().startItemNumber + data.Products.length - 1;

                        
                        //$defer.resolve($scope.model.productList = data.Products);
                        $defer.resolve($scope.model.productList);
                        
                        //Refresh and populate checkboxes.items array.
                        $scope.checkboxes.items = [];
                        $scope.checkboxes.topChecked = false;
                        for (var i = 0; i < $scope.model.productList.length; i++) {
                            $scope.checkboxes.items[i] = false;
                        }
                        $scope.hasEditItemChecked = false;

                        //Show table.
                        $scope.showProductList = true;                        
                    }, 500);
                }, function (error) {
                    //alert("Error getting product list data.");
                    exDialog.openMessage($scope, "Error getting product list data.", "Error", "error");
                });
            }
        }
        else {
            //Reset re-search flag.
            bypassGetData = false;
        }
    };

    //Called from search button.
    $scope.clickGo = function () {
        reloadType = "";
        loadProductList();
    };

    //Validate inputs and build JSON string.
    var getFilterJson = function () {
        var isValid = false;
        var filterJson = { json: "{", error: "" };

        //For refreshing add-new data. 
        if ($scope.newProductIds.length > 0) {
            filterJson.json += "\"NewProductIds\": " + JSON.stringify($scope.newProductIds) + ", "
            //Reset array.
            $scope.newProductIds = [];
        }
        else {
            if ($scope.model.pSearchType.selected != "0" && $scope.search.pSearchText != "") {
                filterJson.json += "\"ProductSearchFilter\": {" +
                   "\"ProductSearchField\": \"" + $scope.model.pSearchType.selected + "\"" +
                   ",\"ProductSearchText\": \"" + $scope.search.pSearchText + "\"" +
                   "}, "
            }
            if ($scope.search.pAvailableFrom != "" || $scope.search.pAvailableTo != "") {
                //Convert to short date string and also validate some values such as "02/30/2014" as invalid. 
                var dateFrom = getFormattedDate($scope.search.pAvailableFrom);
                //var test = isDate($scope.search.pAvailableFrom); //Don't need this.
                if (dateFrom == "error") {
                    filterJson.error += "Invalid Available From date.\n";
                    //dateFrom = ""; //Enable this if non-obstructive.
                }
                var dateTo = getFormattedDate($scope.search.pAvailableTo);
                if (dateTo == "error") {
                    filterJson.error += "Invalid Available To date.\n";
                    //dateTo = ""; //Enable this if non-obstructive.
                }
                //From should not be later than To.
                if ($scope.search.pAvailableFrom != "" && $scope.search.pAvailableTo != "") {
                    if ($scope.search.pAvailableFrom > $scope.search.pAvailableTo) {
                        filterJson.error += "Available To date should be greater or equal to Available From date.\n";
                    }
                }
                filterJson.json += "\"DateSearchFilter\": {" +
                                   "\"SearchDateFrom\": \"" + dateFrom + "\"" +
                                   ",\"SearchDateTo\": \"" + dateTo + "\"" +
                                   "}, "
            }
            if ($scope.search.pPriceLow != "" || $scope.search.pPriceHigh != "") {
                var priceLow = $scope.search.pPriceLow;
                if (priceLow != "" && !isNumeric(priceLow)) {
                    filterJson.error += "Invalid Price Low value.\n";
                    //priceLow = ""; //Enable this if non-obstructive.
                }
                var priceHigh = $scope.search.pPriceHigh;
                if (priceHigh != "" && !isNumeric(priceHigh)) {
                    filterJson.error += "Invalid Price High value.\n";
                    //priceHigh = ""; //Enable this if non-obstructive.
                }
                //High should not be smaller than Low.
                if (priceLow != "" && priceHigh != "") {
                    if (parseFloat(priceLow) > parseFloat(priceHigh)) {
                        filterJson.error += "Price High should be greater or equal to Price Low.\n";
                    }
                }
                filterJson.json += "\"PriceSearchFilter\": {" +
                                   "\"SearchPriceLow\": \"" + priceLow + "\"" +
                                   ",\"SearchPriceHigh\": \"" + priceHigh + "\"" +
                                   "}, "
            }
            if ($scope.model.pStatusType.selected != "0") {
                filterJson.json += "\"StatusCode\": " + $scope.model.pStatusType.selected + ","
            }
        }

        filterJson.json +=
            "\"PaginationRequest\": {" +
               "\"PageIndex\": " + pageIndex +
              ",\"PageSize\": " + pageSize +
              ",\"Sort\": {" +
                  "\"SortBy\": \"" + sortBy + "\"" +
                 ",\"SortDirection\": " + sortDirection +
              "}" +
           "}" +
        "}";
        return filterJson;
    };

    //Datepicker.
    $scope.openFrom = function ($event) {
        $event.preventDefault();
        $event.stopPropagation();
        $scope.openedFrom = true;
        $scope.openedTo = false;
    };
    $scope.openTo = function ($event) {
        $event.preventDefault();
        $event.stopPropagation();
        $scope.openedTo = true;
        $scope.openedFrom = false;
    };
    $scope.dateOptions = {
        formatYear: 'yyyy',
        startingDay: 1,
        showWeeks: 'false'
    };
    $scope.format = 'MM/dd/yyyy';

    //Set default object for checkboxes in table including items array.
    $scope.checkboxes = {
        'topChecked': false,        
        items: []
    };    
    var hasUnChecked = function () {
        //Loop to get flag if any item box unchecked.
        var rtn = false;
        for (var i = 0; i < $scope.checkboxes.items.length; i++) {
            if (!$scope.checkboxes.items[i]) {
                rtn = true;
                break;
            }
        }
        return rtn;
    };
    $scope.topCheckboxChange = function () {        
        angular.forEach($scope.checkboxes.items, function (item, index) {
            $scope.checkboxes.items[index] = $scope.checkboxes.topChecked;
        });
        $scope.hasEditItemChecked = $scope.checkboxes.topChecked;
    };
    $scope.listCheckboxChange = function () {
        $scope.checkboxes.topChecked = !hasUnChecked();
        
        //Set flag for disabling/enabing buttons related to checkbox status.
        $scope.hasEditItemChecked = false;
        for (var i = 0; i < $scope.checkboxes.items.length; i++) {
            if ($scope.checkboxes.items[i]) {
                $scope.hasEditItemChecked = true;
                break;
            }
        }
    };
    
    $scope.deleteProducts = function () {
        var idsForDelete = [];
        angular.forEach($scope.checkboxes.items, function (item, index) {
            if (item == true) {
                idsForDelete.push($scope.model.productList[index].ProductID);
            }
        });
        if (idsForDelete.length > 0) {
            var temp = "s";
            var temp2 = "s have"
            if (idsForDelete.length == 1) {
                temp = "";
                temp2 = " has";
            }
            exDialog.openConfirm({
                scope: $scope,
                title: "Delete Confirmation",
                message: "Are you sure to delete selected product" + temp + "?"
            }).then(function (value) {
                deleteProducts.post(idsForDelete, function (data) {
                    exDialog.openMessage({
                        scope: $scope,
                        message: "The product" + temp2 + " successfully been deleted.",
                        closeAllDialogs: true
                    });
                    //Refresh table data.
                    reloadType = "refresh";
                    loadProductList();
                }, function (error) {
                    //Do nothing.
                });
            });
        }
    };

    //For communicating with ng-table scope through prototype inheritance.  
    $scope.paging = {};
    //For caching and passing back product id array.
    $scope.newProductIds = [];

    //Called from clicking Product Name link in table.
    $scope.paging.openProductForm = function (id) {
        $scope.productId = undefined;
        if (id != undefined) {
            $scope.productId = id;
        }
        exDialog.openPrime({
            scope: $scope,
            template: 'Pages/_product.html',
            controller: 'productController',
            width: '450px',
            beforeCloseCallback: refreshGrid,
            closeByXButton: false,
            closeByClickOutside: false,
            closeByEscKey: false
        });
    };

    //Callback function to refresh the table. 
    var refreshGrid = function () {
        if ($scope.newProductIds.length > 0) {
            reloadType = "add";
            loadProductList();
        }
        else {
            reloadType = "refresh";
            loadProductList();
        }        
        return true;
    };
}])

.controller('productController', ['$scope', '$rootScope', '$timeout', 'exDialog', 'productObj', 'categories', 'productStatusTypes', 'addProduct', 'updateProduct', function ($scope, $rootScope, $timeout, exDialog, productObj, categories, productStatusTypes, addProduct, updateProduct) {
    $scope.model.Product = {};
    //$scope.model.errorMessage = undefined;
    var maxAddPerLoad = 10;

    //For input fields on draggable dialog,
    $scope.setDrag = function (flag) {
        $rootScope.noDrag = flag;
    }
    
    //Obtain lookup data.
    $scope.model.CategoryList = categories.query({}, function (data) {
        $scope.model.ProductStatusTypes = productStatusTypes.query({}, function (data) {
        }, function (error) {
            exDialog.openMessage($scope, "Error getting product status type data.", "Error", "error");
        });
    }, function (error) {
        //alert("Error getting product list data.");
        exDialog.openMessage($scope, "Error getting category list data.", "Error", "error");
    });

    if ($scope.productId == undefined) {
        $scope.productDialogTitle = "Add Product";
        $scope.model.selCategory = { selected: 0 };
        $scope.model.selStatusType = { selected: 0 };
    }
    else {
        $scope.productDialogTitle = "Update Product";

        productObj.query({ id: $scope.productId }, function (data) {
            data.UnitPrice = parseFloat(data.UnitPrice.toFixed(2)); //parseFloat for input type 'number'.
            $scope.model.selCategory = { selected: data.CategoryID };
            $scope.model.selStatusType = { selected: data.StatusCode };
            var avDate = new Date(data.AvailableSince);
            data.AvailableSince = getFormattedDate(avDate);
            $scope.model.Product = data;
        }, function (error) {
            exDialog.openMessage($scope, "Error getting product data.", "Error", "error");
        });
    }

    $scope.saveProduct = function (isValid) {
        // check to make sure the form is completely valid
        if (!isValid) {
            exDialog.openMessage({
                scope: $scope,
                title: "Error",
                icon: "error",
                message: "Invalid data entry.",
                closeAllDialogs: true
            });
            return false;
        }

        //Assign dropdown values to object properties.
        $scope.model.Product.CategoryID = $scope.model.selCategory.selected;
        $scope.model.Product.StatusCode = $scope.model.selStatusType.selected;

        var title, message;
        if ($scope.model.Product.ProductID > 0) {
            title = "Update Confirmation";
            message = "Are you sure to update the product?";
        }
        else {
            title = "Add Confirmation";
            message = "Are you sure to add the product?";
        }
        exDialog.openConfirm({
            scope: $scope,
            title: title,
            message: message
            //keepOpenForAction: true
        }).then(function (value) {
            //Save product to db.
            if ($scope.model.Product.ProductID > 0) {
                updateProduct.post($scope.model.Product, function (data) {                    
                    //$setPristine will reset form, set form and element dirty flags to false, and clean up all items in $error object. 
                    //--Such as:                     
                    //--$scope.productForm.txtUnitPrice.$setValidity("required", true);
                    //--$scope.productForm.txtUnitPrice.$setValidity("max", true);
                    //This will also auto set $scope.body.dirty to false to disable dirty warning when using $scope.$watch for form $dirty changes.
                    $scope.productForm.$setPristine();

                    exDialog.openMessage({
                        scope: $scope,
                        message: "The product has successfully been updated.",
                        closeAllDialogs: true
                    });                    
                }, function (error) {
                    exDialog.openMessage($scope, "Error updating product data.", "Error", "error");
                });
            }
            else {
                addProduct.post($scope.model.Product, function (data) {
                    //Reset form.
                    $scope.productForm.$setPristine();

                    //Adding productId to array.
                    $scope.newProductIds.push(data.ProductID);

                    if ($scope.newProductIds.length < maxAddPerLoad) {
                        //Continue to add product items.
                        exDialog.openConfirm({
                            scope: $scope,
                            message: "The new product has successfully been added. \n\nWould you like to add another?",
                            messageAddClass: 'ng-with-newlines'
                            //closeImmediateParentByAction: true
                        }).then(function (value) {
                            clearAddForm();
                        }, function (reason) {
                            //This will auto refresh table with newly added products via callback.
                            exDialog.closeAll();                            
                        });
                    }
                    else {
                        //Reach maximum number of records for one load/refresh cycle.
                        exDialog.openMessage({
                            scope: $scope,
                            message: "The new product has successfully been added. \n\nThis is the last new product that can be added in current data load operation.",
                            messageAddClass: 'ng-with-newlines',
                            closeAllDialogs: true
                        });
                    }
                }, function (error) {
                    exDialog.openMessage($scope, "Error adding product data.", "Error", "error");
                });
            }
        });
    };

    $scope.setVisited = function (baseElementName) {
        if ($scope.productForm[baseElementName]) {
            $scope.productForm[baseElementName]['$visited'] = true;
        }
    };

    var clearAddForm = function () {
        $scope.disableValidation = true;
        $scope.model.Product.ProducID = 0;
        $scope.model.Product.ProductName = '';
        $scope.model.selCategory = { selected: 0 };
        $scope.model.Product.UnitPrice = '';
        $scope.model.selStatusType = { selected: 0 };
        $scope.model.Product.AvailableSince = '';
        
        //Also clear validation tracking values.
        //Already called $scope.productForm.$setPristine() when saving previous item.
        //All built-in form items are re-set by $setPristine but custom flags need to be explicitly reset here. 
        $scope.ddlCategoryDirty = false;
        $scope.ddlStatusDirty = false;
        $scope.productForm.txtProductName.$setValidity("required", true);
        $scope.productForm.txtUnitPrice.$setValidity("required", true);
        $scope.productForm.txtProductName.$visited = false;

        //Need DOM operation to auto focus the ProductName field although using DOM code in a controller is not a good practice. 
        //Also need $timeout service for MS-Edge, Chrome, Firefox (but not IE). Otherwise the box will be focused with "required" validation error.
        $timeout(function () {
            angular.element(document.querySelector('#txtProductName'))[0].focus();
        });
    };

    //Datepicker.
    $scope.openDatePicker = function ($event) {
        $event.preventDefault();
        $event.stopPropagation();
        $scope.opened = true;
    };
    $scope.dateOptions = {
        formatYear: 'yyyy',
        startingDay: 1,
        showWeeks: 'false'
    };
    $scope.format = 'MM/dd/yyyy';

    //Dirty sign (control border color) for Category dropdown.    
    $scope.categoryChanged = function (selected) {
        if (selected != 0) 
            $scope.ddlCategoryDirty = true;
        else
            $scope.ddlCategoryDirty = false;
    };
    //Dirty sign (control border color) for Product Status dropdown.    
    $scope.statusChanged = function (selected) {
        if (selected != 0)
            $scope.ddlStatusDirty = true;
        else
            $scope.ddlStatusDirty = false;
    };

    //Cache form dirty flag for close page warning.
    $scope.$watch("productForm.$dirty", function (newValue, oldValue) {
        if (newValue != oldValue) {            
            $scope.body.dirty = newValue;
        }        
    });

    $scope.cancelAddOrUpdate = function () {
        if ($scope.productForm.$dirty) {
            //Build string part for differences in message text. 
            var temp = "adding";
            if ($scope.model.Product.ProductID > 0)
                temp = "updating";

            exDialog.openConfirm({
                scope: $scope,
                title: "Cancel Confirmation",
                message: "Are you sure to discard changes and cancel " + temp + " product?"
            }).then(function (value) {
                doCancel();
            }, function (leaveIt) {
                //Do nothing.               
            });
        }
        else {
            doCancel();
        }        
    };
    var doCancel = function () {
        //Clear form and explicitly reset $dirty flag to avoid dirty propagation to parent scope.
        $scope.productForm.$setPristine();
        $scope.body.dirty = false;
        $scope.closeThisDialog('close');
    };
}])

.controller('contactListController', ['$scope', '$timeout', '$location', 'ngTableParams', 'exDialog', 'contactList', 'localData', 'addContacts', 'updateContacts', 'deleteContacts', function ($scope, $timeout, $location, ngTableParams, exDialog, contactList, localData, addContacts, updateContacts, deleteContacts) {
    $scope.formLoaded = false;
    $scope.model = {};
    $scope.model.contactList = [];
    $scope.model.contactList_0 = [];
    $scope.tableParams = undefined;
    //Get primary types from localData.
    $scope.model.primaryTypes = localData.getPrimaryTypes();

    //As a constant.
    $scope.maxAddNumber = 5;     
    //Add-new item count (exclude those undefined). If > 0, the editRowCount must be 0.
    $scope.addRowCount = 0;
    //Selected edit item count. If > 0, the addRowCount must be 0.
    $scope.editRowCount = 0;
       
    $scope.isEditDirty = false;
    $scope.isAddDirty = false;
    $scope.rowDisables = [];
    $scope.checkboxes = {
        'topChecked': false,
        'topDisabled': false,
        items: []
    };
    var bypassWatch = false;    
    //Set index number beyond which are for newly added.
    var maxEditableIndex = 0;    
    var seqNumber = 0;
    var loadingCount = 0;

    //contactList count contains disabledRow count when removing added rows.
    //displayCount should be original loading count plus active addRowCount.
    $scope.model.displayCount = function () {
        return loadingCount + $scope.addRowCount;
    };

    //$scope.model.errorMessage = "Invalid input";    
    $scope.validateAtBlur = function (invalid) {
        $scope.inputInvalid = invalid;
    };
    
    var loadContactList = function () {
        $scope.tableParams = new ngTableParams({
            page: 1, 
            count: 0
        }, {
            getData: getDataForGrid
        });
    };    

    var getDataForGrid = function ($defer, params) {
        $scope.errorMessage = undefined;
        
        //Get data from database.
        contactList.query({}, function (data) {
            $timeout(function () {
                $scope.model.contactList = data.Contacts;

                //Set last index number before adding new.
                maxEditableIndex = $scope.model.contactList.length - 1;

                //Populate checkboxes.items array.
                for (var i = 0; i < $scope.model.contactList.length; i++) {
                    $scope.checkboxes.items[i] = false;
                    $scope.rowDisables[i] = false;
                }

                //Make deep clone of data list for record-based cancel/undo.
                $scope.model.contactList_0 = angular.copy(data.Contacts);

                //Set original load data row count.
                loadingCount = $scope.model.contactList.length;
                
                //Reset add and edit counts, and scope dirty flags for refreshing data.
                $scope.addRowCount = 0;
                $scope.editRowCount = 0;
                $scope.isAddDirty = false;
                $scope.isEditDirty = false;

                //Resolve data list to callback parameter.
                $defer.resolve($scope.model.contactList);

                //Show table.
                $scope.showContactList = true;                    
            }, 500);
        }, function (error) {
            //alert("Error getting contact list data.");
            exDialog.openMessage($scope, "Error getting Contact list data.", "Error", "error");
        });                
    };

    //Initial call to load data to table.
    loadContactList();

    //Page label.
    $scope.contactTitle = {
        0: "No contact item",
        1: "Contact List (total 1 contact)",
        other: "Contact List (total {} contacts)"
    };

    //For checkboxes.
    var hasUnChecked = function () {
        //Loop to get flag if any item box unchecked.
        var rtn = false;
        for (var i = 0; i <= maxEditableIndex; i++) {
            if (!$scope.checkboxes.items[i]) {
                rtn = true;
                break;
            }
        }
        return rtn;
    };

    $scope.topCheckboxChange = function () {
        //Click the top checkbox.
        if ($scope.checkboxes.topChecked) {
            //Only available for edit status.
            for (var i = 0; i <= maxEditableIndex ; i++) {
                if (!$scope.checkboxes.items[i]) {
                    $scope.checkboxes.items[i] = true;
                }
            }
            $scope.editRowCount = $scope.checkboxes.items.length;
        } 
        else {
            //Uncheck top box.
            if ($scope.addRowCount > 0 && $scope.editRowCount == 0) {                
                cancelAllAddRows("topCheckbox");
            }
            else if ($scope.addRowCount == 0 && $scope.editRowCount > 0) {
                cancelAllEditRows("topCheckbox");
            }                       
        }  
    };

    $scope.listCheckboxChange = function (listIndex) {        
        //Click a single checkbox for row.
        if ($scope.checkboxes.items[listIndex]) {
            //Increase editRowCount when checking the checkbox.
            $scope.editRowCount += 1;            
        }
        else {
            //Cancel row operation when unchecking the checkbox.
            if (listIndex > maxEditableIndex) {
                //Add status.
                if (dataChanged($scope.model.contactList[listIndex],
                                $scope.model.contactList_0[listIndex])) {                
                    exDialog.openConfirm({
                        scope: $scope,
                        title: "Cancel Confirmation",
                        message: "Are you sure to discard changes and remove this new row?"
                    }).then(function (value) {
                        cancelAddRow(listIndex);
                    }, function (forCancel) {
                        undoCancelRow(listIndex);
                    });
                }
                else {
                    //Remove added row silently.
                    cancelAddRow(listIndex);
                }
            }
            else {
                //Edit status.
                if (dataChanged($scope.model.contactList[listIndex],
                                $scope.model.contactList_0[listIndex])) {
                    //Popup for cancel.
                    exDialog.openConfirm({
                        scope: $scope,
                        title: "Cancel Confirmation",
                        message: "Are you sure to discard changes and cancel editing for this row?"
                    }).then(function (value) {
                        cancelEditRow(listIndex, true);
                    }, function (forCancel) {
                        undoCancelRow(listIndex);
                    });
                }
                else {                    
                    //Resume display row silently.
                    cancelEditRow(listIndex);
                }                
            }
        }        
        //Sync top checkbox.
        if ($scope.addRowCount > 0 && $scope.editRowCount == 0)        
            //Alway true in Add status.
            $scope.checkboxes.topChecked = true;
        else if ($scope.addRowCount == 0 && $scope.editRowCount > 0)
            $scope.checkboxes.topChecked = !hasUnChecked();
    };
    
    var cancelAddRow = function (listIndex) {
        //Handles array element position shift issue. 
        if (listIndex == $scope.checkboxes.items.length - 1) {
            //It's the last row.
            //Remove rows including all already undefined rows after the last active (defined) row.
            for (var i = listIndex; i > maxEditableIndex; i--) {
                //Do contactList_0 first to avoid additional step in watching cycle.
                $scope.model.contactList_0.splice(i, 1);
                $scope.model.contactList.splice(i, 1);
                $scope.checkboxes.items.splice(i, 1);

                //There is only one add-row.
                if (i == maxEditableIndex + 1) {
                    //Reset addRowCount.
                    $scope.addRowCount = 0;

                    //Reset seqNumber.
                    seqNumber = 0;
                }
                else {
                    //Reduce $scope.addRowCount.
                    $scope.addRowCount -= 1;

                    //Exit loop if next previous row is not undefined.
                    if ($scope.model.contactList[i - 1] != undefined) {
                        break;
                    }
                }
            }
        }
        else {
            //It's not the last row, then set the row to undefined.
            $scope.model.contactList_0[listIndex] = undefined;
            $scope.model.contactList[listIndex] = undefined;
            $scope.checkboxes.items[listIndex] = undefined;

            //Reduce $scope.addRowCount
            $scope.addRowCount -= 1;
        }        
    };

    var cancelAllAddRows = function (callFrom) {
        if ($scope.isAddDirty) {
            exDialog.openConfirm({
                scope: $scope,
                title: "Cancel Confirmation",
                message: "Are you sure to discard changes and cancel adding for all rows?"
            }).then(function (value) {
                if (callFrom == "topCheckbox") 
                    cancelAllAddRowsRun();
                else if (callFrom == "cancelButton")
                {
                    //Reset form.
                    $scope.contactForm.$setPristine();
                    $scope.body.dirty = false;
                }   

                //Reload table by setting dummy count as a trigger.                     
                $scope.tableParams.count($scope.tableParams.count() + 1);

            }, function (forCancel) {
                //Set back checked.
                if (callFrom == "topCheckbox")
                    $scope.checkboxes.topChecked = true;
            });
        }
        else {
            if (callFrom == "topCheckbox")
                cancelAllAddRowsRun();
            else if (callFrom == "cancelButton")
                //Reload table.
                $scope.tableParams.count($scope.tableParams.count() + 1);
        }
    }
    var cancelAllAddRowsRun = function () {
        for (var i = $scope.checkboxes.items.length - 1; i > maxEditableIndex; i--) {
            $scope.model.contactList_0.splice(i, 1);
            $scope.model.contactList.splice(i, 1);
            $scope.checkboxes.items.splice(i, 1);
        }
        //Reset addRowCount.
        $scope.addRowCount = 0;

        //Reset seqNumber.
        seqNumber = 0;

        //Reset form.
        $scope.contactForm.$setPristine();
        $scope.body.dirty = false;
    };

    var cancelEditRow = function (listIndex, copyBack) {
        if (copyBack) {
            //Copy back data item.
            $scope.model.contactList[listIndex] = angular.copy($scope.model.contactList_0[listIndex]);
        }
        //Reduce editRowCount.
        $scope.editRowCount -= 1;
    };

    var cancelAllEditRows = function (callFrom) {
        if ($scope.isEditDirty) {
            //Build string part for differences in message text. 
            var temp = "";
            if (callFrom == "topCheckbox") {
                temp = "all rows";
            }
            else if (callFrom == "cancelButton") {
                if ($scope.editRowCount == 1)
                    temp = "the selected row";
                else
                    temp = "selected rows";
            }

            exDialog.openConfirm({
                scope: $scope,
                title: "Cancel Confirmation",
                message: "Are you sure to discard changes and cancel editing for " + temp + "?"
            }).then(function (value) {
                for (var i = 0; i <= maxEditableIndex ; i++) {
                    if ($scope.checkboxes.items[i]) {
                        $scope.checkboxes.items[i] = false;

                        //Copy back data item.
                        $scope.model.contactList[i] = angular.copy($scope.model.contactList_0[i]);
                    }
                }
                //Reset editRowCount.
                $scope.editRowCount = 0;

                //Set top checkbox to false anyway (cancel from button is a must).
                $scope.checkboxes.topChecked = false;

                //Reset form.
                $scope.contactForm.$setPristine();
                $scope.body.dirty = false;

            }, function (forCancel) {
                if (callFrom == "topCheckbox") {
                    //Set checkbox back to true.
                    $scope.checkboxes.topChecked = true;
                }                
            });
        }
        else {
            //Pristine (just in edit status but not touched/visited).
            for (var i = 0; i <= maxEditableIndex ; i++) {
                if ($scope.checkboxes.items[i]) {
                    $scope.checkboxes.items[i] = false;

                    //Reset editRowCount.
                    $scope.editRowCount = 0;
                }
            }
            //Set top checkbox to false anyway (cancel from button is a must).
            $scope.checkboxes.topChecked = false;
        }
    }

    var undoCancelRow = function (listIndex) {
        //Cancel edit or add - reset checked back and sync topChecked.                    
        $scope.checkboxes.items[listIndex] = true;
        //Syn top check box.
        $scope.checkboxes.topChecked = !hasUnChecked();
    }; 
    
    $scope.setVisited = function (baseElementName, listIndex) {
        //For add-new field, add $visited flag for any first focusing so that 
        //validation will occur if leaving empty. >> $pristine doesn't work for this scenario.
        if (listIndex > maxEditableIndex) {
            $scope.contactForm[baseElementName + '_' + listIndex]['$visited'] = true;
        }
    };

    $scope.addNewContact = function () {        
        //Add new row to table.
        //Set max added-row number limit.
        if ($scope.addRowCount + 1 == $scope.maxAddNumber) {
            exDialog.openMessage({
                scope: $scope,
                title: "Warning",
                icon: "warning",
                message: "The maximum number (" + $scope.maxAddNumber + ") of added rows for one submission is approached."
            });            
        }         
        bypassWatch = true;        

        //Add empty row to the bottom of table.
        var newContact = {
            ContactID: 0,
            ContactName: '',
            Phone: '',
            Email: '',
            PrimaryType: 0
        };
        $scope.model.contactList.push(newContact);

        //Add new item to base array.
        $scope.model.contactList_0.push(angular.copy(newContact));        

        //Add to checkboxes.items.        
        seqNumber += 1;
        $scope.checkboxes.items[maxEditableIndex + seqNumber] = true;

        //Update addRowCount.
        $scope.addRowCount += 1;                
    };

    $scope.deleteContacts = function () {
        var idsForDelete = [];
        angular.forEach($scope.checkboxes.items, function (item, index) {
            if (item == true) {
                idsForDelete.push($scope.model.contactList[index].ContactID);
            }
        });
        if (idsForDelete.length > 0) {
            var temp = "s";
            var temp2 = "s have"
            if (idsForDelete.length == 1) {
                temp = "";
                temp2 = " has";
            }
            exDialog.openConfirm({
                scope: $scope,
                title: "Delete Confirmation",
                message: "Are you sure to delete selected contact" + temp + "?"
            }).then(function (value) {
                deleteContacts.post(idsForDelete, function (data) {
                    exDialog.openMessage({
                        scope: $scope,
                        message: "The " + temp2 + " successfully been deleted."
                    });
                    //Refresh table.
                    //Dummy setting just for triggering data re-load.
                    //The pageSize variable is used on-the-fly for pager while the count() is for keep state. 
                    $scope.tableParams.count($scope.tableParams.count() + 1);

                }, function (forCancel) {
                    exDialog.openMessage($scope, "Error deleting contact data.", "Error", "error");
                });
            });
        }
    };

    $scope.SaveChanges = function () {        
        //Prepare message text.
        var title, message, temp, temp2;
        temp = "s";
        temp2 = "s have";
        if ($scope.addRowCount == 1 || $scope.editRowCount == 1) {
            temp = "";
            temp2 = " has"
        }

        if ($scope.isEditDirty) {            
            title = "Update Confirmation";
            message = "Are you sure to update selected contact" + temp + "?";
        }
        else if ($scope.isAddDirty) {
            title = "Add Confirmation";
            message = "Are you sure to add the contact" + temp + "?";
        }
        exDialog.openConfirm({
            scope: $scope,
            title: title,
            message: message//,
            //keepOpenForAction: true
        }).then(function (value) {
            if ($scope.isEditDirty) {
                //Update data list.
                updateContacts.post($scope.model.contactList, function (data) {
                    //Reset form.
                    $scope.contactForm.$setPristine();
                    $scope.body.dirty = false;

                    exDialog.openMessage($scope, "Selected contact" + temp2 + " successfully been updated.");
                    //Refresh table.
                    //Dummy setting just for triggering data re-load.
                    //The pageSize variable is used on-the-fly for pager while the count() is for keep state. 
                    $scope.tableParams.count($scope.tableParams.count() + 1);

                }, function (error) {
                    exDialog.openMessage($scope, "Error updating contact data.", "Error", "error");
                });
            }
            else if ($scope.isAddDirty) {
                //Add new item.
                var activeAddItems = [];
                for (var i = maxEditableIndex + 1; i < $scope.model.contactList.length; i++) {
                    if ($scope.model.contactList[i] != undefined) {
                        activeAddItems.push($scope.model.contactList[i]);
                    }
                }
                
                addNewContacts.post(activeAddItems, function (data) {                
                    //Reset form.
                    $scope.contactForm.$setPristine();
                    $scope.body.dirty = false;

                    //data.ContactIdList contains newly added ContactID values.
                    exDialog.openMessage($scope, "The new contact" + temp2 + " successfully been added.");

                    //Refresh table.
                    //Dummy setting just for triggering data re-load.
                    //The pageSize variable is used on-the-fly for pager while the count() is for keep state. 
                    $scope.tableParams.count($scope.tableParams.count() + 1);

                }, function (error) {
                    exDialog.openMessage($scope, "Error adding contact data.", "Error", "error");
                });
            }
        });
    };

    //Click Cancel Changes button.
    $scope.CanelChanges = function () {        
        //The same action results as unchecking top checkbox.
        if ($scope.isEditDirty || (!$scope.isEditDirty && $scope.editRowCount > 0)) {            
            cancelAllEditRows("cancelButton");            
        }
        else if ($scope.isAddDirty || (!$scope.isAddDirty && $scope.addRowCount > 0)) {            
            cancelAllAddRows("cancelButton");            
        }
    };

    //Do something when Add status is on/off.
    $scope.$watch("addRowCount", function (newValue, oldValue) {        
        if (oldValue == 0 && newValue > 0) {
            //Disable all editable checkboxes.
            disableEditRows(true);
            $scope.checkboxes.topChecked = true;
        }
        else if (oldValue > 0 && newValue == 0) {
            //Reset isAddDirty flag and enable checkboxes.
            $scope.isAddDirty = false;            
            disableEditRows(false);
            $scope.checkboxes.topChecked = false;

            //Set dirty flag for close page warning.
            $scope.body.dirty = $scope.isAddDirty;
        }
    });

    //$scope.contactForm.$dirty cannot be use for data change only.
    //Other changes such as click checkbox will make it dirty.
    $scope.$watch("model.contactList", function (newValue, oldValue) {
        if (bypassWatch) {
            bypassWatch = false;
        } 
        else {
            //Not for the first loading.
            if (oldValue.length != undefined) {
                //Use custom object comparison due to existance of "$$hashKey".                
                if ($scope.model.contactList.length - 1 > maxEditableIndex) {
                    //Compare the new add row only.
                    if (dataChanged($scope.model.contactList[maxEditableIndex + 1],
                                    $scope.model.contactList_0[maxEditableIndex + 1])) {
                        $scope.isAddDirty = true;
                    }
                    else {
                        $scope.isAddDirty = false;
                    }
                    //Set dirty flag for close page warning.
                    $scope.body.dirty = $scope.isAddDirty;
                }
                else {
                    //For editable rows.
                    if (dataChanged($scope.model.contactList, $scope.model.contactList_0)) {
                        $scope.isEditDirty = true;
                    }
                    else {
                        $scope.isEditDirty = false;
                    }
                    //Set dirty flag for close page warning.
                    $scope.body.dirty = $scope.isEditDirty;
                }
            }
        }       
    }, true);
        
    //Check data list changed using deep cloned set.
    var dataChanged = function (data_1, data_2) {
        var isChanged = false;
        if (angular.isArray(data_1)) {
            for (var idx = 0; idx < data_1.length; idx++) {
                for (var propName in data_1[idx]) {
                    if (propName != "$$hashKey") {
                        if (data_1[idx][propName] != data_2[idx][propName]) {
                            isChanged = true;
                            break;
                        }
                    }
                }
                if (isChanged) break;
            }
        }
        else {
            for (var propName in data_1) {
                if (propName != "$$hashKey") {
                    if (data_1[propName] != data_2[propName]) {
                        isChanged = true;
                        break;
                    }
                }
            }
        }        
        return isChanged;        
    };

    var disableEditRows = function (flag) {
        for (var i = 0; i <= maxEditableIndex; i++) {
            $scope.rowDisables[i] = flag;
        }
    };

    //Dirty sign (control border color) for Primary Type dropdown.
    $scope.ddlPrimaryTypeDirty = [];
    $scope.primaryTypeChanged = function (index, selected) {
        if (selected != $scope.model.contactList_0[index].PrimaryType)
            $scope.ddlPrimaryTypeDirty[index] = true;
        else
            $scope.ddlPrimaryTypeDirty[index] = false;
    };      
}])

.controller('aboutController', ['$scope', function ($scope) {
    $scope.message = 'This is an example.';
}])
;
//Global function.
function getFormattedDate(date) {
    if (date == "") return "";
    try {
        var year = date.getFullYear();
        var month = (1 + date.getMonth()).toString();
        month = month.length > 1 ? month : '0' + month;
        var day = date.getDate().toString();
        day = day.length > 1 ? day : '0' + day;
        return month + '/' + day + '/' + year;
    }
    catch (err) {
        return "error";
    }
}
function isNumeric(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
}

