﻿/**
@module breeze
**/

var EntityManager = (function () {
  /**
  Instances of the EntityManager contain and manage collections of entities, either retrieved from a backend datastore or created on the client.
  @class EntityManager
  **/

  /**
  At its most basic an EntityManager can be constructed with just a service name
  @example
      var entityManager = new EntityManager( "breeze/NorthwindIBModel");
  This is the same as calling it with the following configuration object
  @example
      var entityManager = new EntityManager( {serviceName: "breeze/NorthwindIBModel" });
  Usually however, configuration objects will contain more than just the 'serviceName';
  @example
      var metadataStore = new MetadataStore();
      var entityManager = new EntityManager( {
          serviceName: "breeze/NorthwindIBModel",
          metadataStore: metadataStore
      });
  or
  @example
      return new QueryOptions({
          mergeStrategy: obj,
          fetchStrategy: this.fetchStrategy
      });
      var queryOptions = new QueryOptions({
          mergeStrategy: MergeStrategy.OverwriteChanges,
          fetchStrategy: FetchStrategy.FromServer
      });
      var validationOptions = new ValidationOptions({
          validateOnAttach: true,
          validateOnSave: true,
          validateOnQuery: false
      });
      var entityManager = new EntityManager({
          serviceName: "breeze/NorthwindIBModel",
          queryOptions: queryOptions,
          validationOptions: validationOptions
      });
  @method <ctor> EntityManager
  @param [config] {Object|String} Configuration settings or a service name.
  @param [config.serviceName] {String}
  @param [config.dataService] {DataService} An entire DataService (instead of just the serviceName above).
  @param [config.metadataStore=MetadataStore.defaultInstance] {MetadataStore}
  @param [config.queryOptions] {QueryOptions}
  @param [config.saveOptions] {SaveOptions}
  @param [config.validationOptions=ValidationOptions.defaultInstance] {ValidationOptions}
  @param [config.keyGeneratorCtor] {Function}
  **/
  var ctor = function EntityManager(config) {

    if (arguments.length > 1) {
      throw new Error("The EntityManager ctor has a single optional argument that is either a 'serviceName' or a configuration object.");
    }
    if (arguments.length === 0) {
      config = { serviceName: "" };
    } else if (typeof config === 'string') {
      config = { serviceName: config };
    }

    updateWithConfig(this, config, true);

    this.entityChanged = new Event("entityChanged", this);
    this.validationErrorsChanged = new Event("validationErrorsChanged", this);
    this.hasChangesChanged = new Event("hasChangesChanged", this);

    this.clear();

  };

  var proto = ctor.prototype;
  proto._$typeName = "EntityManager";
  Event.bubbleEvent(proto, null);

  /**
  General purpose property set method.  Any of the properties documented below
  may be set.
  @example
      // assume em1 is a previously created EntityManager
      // where we want to change some of its settings.
      em1.setProperties( {
          serviceName: "breeze/foo"
      });
  @method setProperties
  @param config {Object}
  @param [config.serviceName] {String}
  @param [config.dataService] {DataService}
  @param [config.queryOptions] {QueryOptions}
  @param [config.saveOptions] {SaveOptions}
  @param [config.validationOptions] {ValidationOptions}
  @param [config.keyGeneratorCtor] {Function}
  **/
  proto.setProperties = function (config) {
    updateWithConfig(this, config, false);
  };

  function updateWithConfig(em, config, isCtor) {
    var defaultQueryOptions = isCtor ? QueryOptions.defaultInstance : em.queryOptions;
    var defaultSaveOptions = isCtor ? SaveOptions.defaultInstance : em.saveOptions;
    var defaultValidationOptions = isCtor ? ValidationOptions.defaultInstance : em.validationOptions;


    var configParam = assertConfig(config)
        .whereParam("serviceName").isOptional().isString()
        .whereParam("dataService").isOptional().isInstanceOf(DataService)
        .whereParam("queryOptions").isInstanceOf(QueryOptions).isOptional().withDefault(defaultQueryOptions)
        .whereParam("saveOptions").isInstanceOf(SaveOptions).isOptional().withDefault(defaultSaveOptions)
        .whereParam("validationOptions").isInstanceOf(ValidationOptions).isOptional().withDefault(defaultValidationOptions)
        .whereParam("keyGeneratorCtor").isFunction().isOptional();
    if (isCtor) {
      configParam = configParam
          .whereParam("metadataStore").isInstanceOf(MetadataStore).isOptional().withDefault(new MetadataStore());
    }
    configParam.applyAll(em);

    // insure that entityManager's options versions are completely populated
    __updateWithDefaults(em.queryOptions, defaultQueryOptions);
    __updateWithDefaults(em.saveOptions, defaultSaveOptions);
    __updateWithDefaults(em.validationOptions, defaultValidationOptions);

    if (config.serviceName) {
      em.dataService = new DataService({
        serviceName: em.serviceName
      });
    }
    em.serviceName = em.dataService && em.dataService.serviceName;

    em.keyGeneratorCtor = em.keyGeneratorCtor || KeyGenerator;
    if (isCtor || config.keyGeneratorCtor) {
      em.keyGenerator = new em.keyGeneratorCtor();
    }
  }

  /**
  The service name associated with this EntityManager.

  __readOnly__
  @property serviceName {String}
  **/

  /**
  The DataService name associated with this EntityManager.

  __readOnly__
  @property dataService {DataService}
  **/

  /**
  The {{#crossLink "MetadataStore"}}{{/crossLink}} associated with this EntityManager.

  __readOnly__
  @property metadataStore {MetadataStore}
  **/

  /**
  The {{#crossLink "QueryOptions"}}{{/crossLink}} associated with this EntityManager.

  __readOnly__
  @property queryOptions {QueryOptions}
  **/

  /**
  The {{#crossLink "SaveOptions"}}{{/crossLink}} associated with this EntityManager.

  __readOnly__
  @property saveOptions {SaveOptions}
  **/

  /**
  The {{#crossLink "ValidationOptions"}}{{/crossLink}} associated with this EntityManager.

  __readOnly__
  @property validationOptions {ValidationOptions}
  **/

  /**
  The {{#crossLink "KeyGenerator"}}{{/crossLink}} constructor associated with this EntityManager.

  __readOnly__
  @property keyGeneratorCtor {KeyGenerator constructor}
  **/


  // events
  /**
  An {{#crossLink "Event"}}{{/crossLink}} that fires whenever a change to any entity in this EntityManager occurs.
  @example
      var em = new EntityManager( {serviceName: "breeze/NorthwindIBModel" });
      em.entityChanged.subscribe(function(changeArgs) {
          // This code will be executed any time any entity within the entityManager is added, modified, deleted or detached for any reason.
          var action = changeArgs.entityAction;
          var entity = changeArgs.entity;
          // .. do something to this entity when it is changed.
      });
  });

  @event entityChanged
  @param entityAction {EntityAction} The {{#crossLink "EntityAction"}}{{/crossLink}} that occured.
  @param entity {Object} The entity that changed.  If this is null, then all entities in the entityManager were affected.
  @param args {Object} Additional information about this event. This will differ based on the entityAction.
  @readOnly
  **/

  /**
  An {{#crossLink "Event"}}{{/crossLink}} that fires whenever validationErrors change for any entity in this EntityManager.
  @example
      var em = new EntityManager( {serviceName: "breeze/NorthwindIBModel" });
      em.validationErrorsChanged.subscribe(function(changeArgs) {
              // This code will be executed any time any entity within the entityManager experiences a change to its validationErrors collection.
              function (validationChangeArgs) {
                  var entity == validationChangeArgs.entity;
                  var errorsAdded = validationChangeArgs.added;
                  var errorsCleared = validationChangeArgs.removed;
                  // ... do something interesting with the order.
              });
          });
      });
  @event validationErrorsChanged
  @param entity {Entity} The entity on which the validation errors have been added or removed.
  @param added {Array of ValidationError} An array containing any newly added {{#crossLink "ValidationError"}}{{/crossLink}}s
  @param removed {Array of ValidationError} An array containing any newly removed {{#crossLink "ValidationError"}}{{/crossLink}}s. This is those
  errors that have been 'fixed'
  @readOnly
  **/

  // class methods

  /**
  Creates a new entity of a specified type and optionally initializes it. By default the new entity is created with an EntityState of Added
  but you can also optionally specify an EntityState.  An EntityState of 'Detached' will insure that the entity is created but not yet added
  to the EntityManager.
  @example
      // assume em1 is an EntityManager containing a number of preexisting entities.
      // create and add an entity;
      var emp1 = em1.createEntity("Employee");
      // create and add an initialized entity;
      var emp2 = em1.createEntity("Employee", { lastName: Smith", firstName: "John" });
      // create and attach (not add) an initialized entity
      var emp3 = em1.createEntity("Employee", { id: 435, lastName: Smith", firstName: "John" }, EntityState.Unchanged);
      // create but don't attach an entity;
      var emp4 = em1.createEntity("Employee", { id: 435, lastName: Smith", firstName: "John" }, EntityState.Detached);

  @method createEntity
  @param entityType {String|EntityType} The EntityType or the name of the type for which an instance should be created.
  @param [initialValues=null] {Config object} - Configuration object of the properties to set immediately after creation.
  @param [entityState=EntityState.Added] {EntityState} - The EntityState of the entity after being created and added to this EntityManager.
  @param [mergeStrategy=MergeStrategy.Disallowed] {MergeStrategy} - How to handle conflicts if an entity with the same key already exists within this EntityManager.
  @return {Entity} A new Entity of the specified type.
  **/
  proto.createEntity = function (entityType, initialValues, entityState, mergeStrategy) {
    assertParam(entityType, "entityType").isString().or().isInstanceOf(EntityType).check();
    assertParam(entityState, "entityState").isEnumOf(EntityState).isOptional().check();
    assertParam(mergeStrategy, "mergeStrategy").isEnumOf(MergeStrategy).isOptional().check();
    if (typeof entityType === "string") {
      entityType = this.metadataStore._getEntityType(entityType);
    }
    entityState = entityState || EntityState.Added;
    var entity;
    __using(this, "isLoading", true, function () {
      entity = entityType.createEntity(initialValues);
    });
    if (entityState !== EntityState.Detached) {
      entity = this.attachEntity(entity, entityState, mergeStrategy);
    }
    return entity;
  };


  /**
  Creates a new EntityManager and imports a previously exported result into it.
  @example
      // assume em1 is an EntityManager containing a number of preexisting entities.
      var bundle = em1.exportEntities();
      // can be stored via the web storage api
      window.localStorage.setItem("myEntityManager", bundle);
      // assume the code below occurs in a different session.
      var bundleFromStorage = window.localStorage.getItem("myEntityManager");
      // and imported
      var em2 = EntityManager.importEntities(bundleFromStorage);
      // em2 will now have a complete copy of what was in em1
  @method importEntities
  @static
  @param exportedString {String} The result of a previous 'exportEntities' call.
  @param [config] {Object} A configuration object.
  @param [config.mergeStrategy] {MergeStrategy} A  {{#crossLink "MergeStrategy"}}{{/crossLink}} to use when
  merging into an existing EntityManager.
  @param [config.metadataVersionFn} {Function} A function that takes two arguments ( the current metadataVersion and the imported store's 'name'}
  and may be used to perform version checking.
  @return {EntityManager} A new EntityManager.  Note that the return value of this method call is different from that
  provided by the same named method on an EntityManager instance. Use that method if you need additional information
  regarding the imported entities.
  **/
  ctor.importEntities = function (exportedString, config) {
    var em = new EntityManager();
    em.importEntities(exportedString, config);
    return em;
  };

  // instance methods

  /**
  Calls EntityAspect.acceptChanges on every changed entity in this EntityManager.
  @method acceptChanges
  **/
  proto.acceptChanges = function () {
    this.getChanges().map(function(entity) {
      return entity.entityAspect._checkOperation("acceptChanges");
    }).forEach(function (aspect) {
      aspect.acceptChanges();
    });
  };

  /**
  Exports selected entities, all entities of selected types, or an entire EntityManager cache.
  @example
  This method takes a snapshot of an EntityManager that can be stored offline or held in memory.
  Use the `EntityManager.importEntities` method to restore or merge the snapshot
  into another EntityManager at some later time.
  @example
      // let em1 be an EntityManager containing a number of existing entities.
      // export every entity in em1.
      var bundle = em1.exportEntities();
      // save to the browser's local storage
      window.localStorage.setItem("myEntityManager", bundle);
      // later retrieve the export
      var bundleFromStorage = window.localStorage.getItem("myEntityManager");
      // import the retrieved export bundle into another manager
      var em2 = em1.createEmptyCopy();
      em2.importEntities(bundleFromStorage);
      // em2 now has a complete, faithful copy of the entities that were in em1
  You can also control exactly which entities are exported.
  @example
      // get em1's unsaved changes (an array) and export them.
      var changes = em1.getChanges();
      var bundle = em1.exportEntities(changes);
      // merge these entities into em2 which may contains some of the same entities.
      // do NOT overwrite the entities in em2 if they themselves have unsaved changes.
      em2.importEntities(bundle, { mergeStrategy: MergeStrategy.PreserveChanges} );
  Metadata are included in an export by default. You may want to exclude the metadata
  especially if you're exporting just a few entities for local storage.
  @example
      var bundle = em1.exportEntities(arrayOfSelectedEntities, {includeMetadata: false});
      window.localStorage.setItem("goodStuff", bundle);
  You may still express this option as a boolean value although this older syntax is deprecated.
  @example
      // Exclude the metadata (deprecated syntax)
      var bundle = em1.exportEntities(arrayOfSelectedEntities, false);
  You can export all entities of one or more specified EntityTypes.
  @example
      // Export all Customer and Employee entities (and also exclude metadata)
      var bundle = em1.exportEntities(['Customer', 'Employee'], {includeMetadata: false});
  All of the above examples return an export bundle as a string which is the default format.
  You can export the bundle as JSON if you prefer by setting the `asString` option to false.
  @example
      // Export all Customer and Employee entities as JSON and exclude the metadata
      var bundle = em1.exportEntities(['Customer', 'Employee'],
                                      {asString: false, includeMetadata: false});
      // store JSON bundle somewhere ... perhaps indexDb ... and later import as we do here.
      em2.importEntities(bundle);
  @method exportEntities
  @param [entities] {Array of Entity | Array of EntityType | Array of String}
    The entities to export or the EntityType(s) of the entities to export;
    all entities are exported if this parameter is omitted or null.
  @param [config] {Object | Boolean} Export configuration options
  @param [config.asString=true] {Boolean} If true (default), return export bundle as a string.
  @param [config.includeMetadata=true] {Boolean} If true (default), include metadata in the export bundle.
  @return {String | Object} The export bundle either serialized (default) or as a JSON object.
  The bundle contains the metadata (unless excluded) and the entity data grouped by type.
  The entity data include property values, change-state, and temporary key mappings (if any).

  The export bundle is an undocumented, Breeze-internal representation of entity data
  suitable for export, storage, and import. The schema and contents of the bundle may change in future versions of Breeze.
  Manipulate it at your own risk with appropriate caution.
  **/
  proto.exportEntities = function (entities, config) {
    assertParam(entities, "entities").isArray().isEntity()
    .or().isNonEmptyArray().isInstanceOf(EntityType)
    .or().isNonEmptyArray().isString()
    .or().isOptional().check();

    assertParam(config, "config").isObject()
    .or().isBoolean()
    .or().isOptional().check();

    if (config == null) {
      config = { includeMetadata: true, asString: true };
    } else if (typeof config === 'boolean') { // deprecated
      config = { includeMetadata: config, asString: true };
    }

    assertConfig(config)
        .whereParam("asString").isBoolean().isOptional().withDefault(true)
        .whereParam("includeMetadata").isBoolean().isOptional().withDefault(true)
        .applyAll(config);

    var exportBundle = exportEntityGroups(this, entities);
    var json = __extend({}, exportBundle, ["tempKeys", "entityGroupMap"]);

    if (config.includeMetadata) {
      json = __extend(json, this, ["dataService", "saveOptions", "queryOptions", "validationOptions"]);
      json.metadataStore = this.metadataStore.exportMetadata();
    } else {
      json.metadataVersion = breeze.metadataVersion;
      json.metadataStoreName = this.metadataStore.name;
    }

    var result = config.asString ? JSON.stringify(json, null, __config.stringifyPad) : json;
    return result;
  };

  /**
  Imports a previously exported result into this EntityManager.
  @example
  This method can be used to make a complete copy of any previously created entityManager, even if created
  in a previous session and stored in localStorage. The static version of this method performs a
  very similar process.
  @example
      // assume em1 is an EntityManager containing a number of existing entities.
      var bundle = em1.exportEntities();
      // bundle can be stored in window.localStorage or just held in memory.
      var em2 = new EntityManager({
          serviceName: em1.serviceName,
          metadataStore: em1.metadataStore
      });
      em2.importEntities(bundle);
      // em2 will now have a complete copy of what was in em1
  It can also be used to merge the contents of a previously created EntityManager with an
  existing EntityManager with control over how the two are merged.
  @example
      var bundle = em1.exportEntities();
      // assume em2 is another entityManager containing some of the same entities possibly with modifications.
      em2.importEntities(bundle, { mergeStrategy: MergeStrategy.PreserveChanges} );
      // em2 will now contain all of the entities from both em1 and em2.  Any em2 entities with previously
      // made modifications will not have been touched, but all other entities from em1 will have been imported.
  @method importEntities
  @param exportedString {String|Json} The result of a previous 'export' call.
  @param [config] {Object} A configuration object.
  @param [config.mergeStrategy] {MergeStrategy} A  {{#crossLink "MergeStrategy"}}{{/crossLink}} to use when
  merging into an existing EntityManager.
  @param [config.metadataVersionFn} {Function} A function that takes two arguments ( the current metadataVersion and the imported store's 'name'}
  and may be used to perform version checking.
  @return result {Object}

  result.entities {Array of Entities} The entities that were imported.
  result.tempKeyMap {Object} Mapping from original EntityKey in the import bundle to its corresponding EntityKey in this EntityManager.
  **/
  proto.importEntities = function (exportedString, config) {
    config = config || {};
    assertConfig(config)
        .whereParam("mergeStrategy").isEnumOf(MergeStrategy).isOptional().withDefault(this.queryOptions.mergeStrategy)
        .whereParam("metadataVersionFn").isFunction().isOptional()
        .applyAll(config);
    var that = this;

    var json = (typeof exportedString === "string") ? JSON.parse(exportedString) : exportedString;
    if (json.metadataStore) {
      this.metadataStore.importMetadata(json.metadataStore);
      // the || clause is for backwards compat with an earlier serialization format.
      this.dataService = (json.dataService && DataService.fromJSON(json.dataService)) || new DataService({ serviceName: json.serviceName });

      this.saveOptions = new SaveOptions(json.saveOptions);
      this.queryOptions = QueryOptions.fromJSON(json.queryOptions);
      this.validationOptions = new ValidationOptions(json.validationOptions);
    } else {
      config.metadataVersionFn && config.metadataVersionFn({
        metadataVersion: json.metadataVersion,
        metadataStoreName: json.metadataStoreName
      });
    }

    var tempKeyMap = {};
    json.tempKeys.forEach(function (k) {
      var oldKey = EntityKey.fromJSON(k, that.metadataStore);
      // try to use oldKey if not already used in this keyGenerator.
      tempKeyMap[oldKey.toString()] = new EntityKey(oldKey.entityType, that.keyGenerator.generateTempKeyValue(oldKey.entityType, oldKey.values[0]));
    });
    var entitiesToLink = [];
    config.tempKeyMap = tempKeyMap;
    __wrapExecution(function () {
      that._pendingPubs = [];
    }, function (state) {
      that._pendingPubs.forEach(function (fn) {
        fn();
      });
      that._pendingPubs = null;
      that._hasChangesAction && that._hasChangesAction();
    }, function () {
      __objectForEach(json.entityGroupMap, function (entityTypeName, jsonGroup) {
        var entityType = that.metadataStore._getEntityType(entityTypeName, true);
        var targetEntityGroup = findOrCreateEntityGroup(that, entityType);
        var entities = importEntityGroup(targetEntityGroup, jsonGroup, config);
        Array.prototype.push.apply(entitiesToLink, entities);
      });
      entitiesToLink.forEach(function (entity) {
        if (!entity.entityAspect.entityState.isDeleted()) {
          that._linkRelatedEntities(entity);
        }
      });
    });
    return {
      entities: entitiesToLink,
      tempKeyMapping: tempKeyMap
    };
  };


  /**
  Clears this EntityManager's cache but keeps all other settings. Note that this
  method is not as fast as creating a new EntityManager via 'new EntityManager'.
  This is because clear actually detaches all of the entities from the EntityManager.
  @example
      // assume em1 is an EntityManager containing a number of existing entities.
      em1.clear();
      // em1 is will now contain no entities, but all other setting will be maintained.
  @method clear
  **/
  proto.clear = function () {
    __objectMap(this._entityGroupMap, function (key, entityGroup) {
      return entityGroup._checkOperation();
    }).forEach(function(entityGroup) {
      entityGroup._clear();
    });

    this._entityGroupMap = {};
    this._unattachedChildrenMap = new UnattachedChildrenMap();
    this.keyGenerator = new this.keyGeneratorCtor();
    this.entityChanged.publish({ entityAction: EntityAction.Clear });
    this._setHasChanges(false);
  };


  /**
  Creates an empty copy of this EntityManager
  @example
      // assume em1 is an EntityManager containing a number of existing entities.
      var em2 = em1.createEmptyCopy();
      // em2 is a new EntityManager with all of em1's settings
      // but no entities.
  @method createEmptyCopy
  @return {EntityManager} A new EntityManager.
  **/
  proto.createEmptyCopy = function () {
    var copy = new ctor(__extend({}, this,
        ["dataService", "metadataStore", "queryOptions", "saveOptions", "validationOptions", "keyGeneratorCtor"]));
    return copy;
  };

  /**
  Attaches an entity to this EntityManager with an  {{#crossLink "EntityState"}}{{/crossLink}} of 'Added'.
  @example
      // assume em1 is an EntityManager containing a number of existing entities.
      var custType = em1.metadataStore.getEntityType("Customer");
      var cust1 = custType.createEntity();
      em1.addEntity(cust1);
  Note that this is the same as using 'attachEntity' with an {{#crossLink "EntityState"}}{{/crossLink}} of 'Added'.
  @example
      // assume em1 is an EntityManager containing a number of existing entities.
      var custType = em1.metadataStore.getEntityType("Customer");
      var cust1 = custType.createEntity();
      em1.attachEntity(cust1, EntityState.Added);
  @method addEntity
  @param entity {Entity} The entity to add.
  @return {Entity} The added entity.
  **/
  proto.addEntity = function (entity) {
    return this.attachEntity(entity, EntityState.Added);
  };

  /**
  Attaches an entity to this EntityManager with a specified {{#crossLink "EntityState"}}{{/crossLink}}.
  @example
      // assume em1 is an EntityManager containing a number of existing entities.
      var custType = em1.metadataStore.getEntityType("Customer");
      var cust1 = custType.createEntity();
      em1.attachEntity(cust1, EntityState.Added);
  @method attachEntity
  @param entity {Entity} The entity to add.
  @param [entityState=EntityState.Unchanged] {EntityState} The EntityState of the newly attached entity. If omitted this defaults to EntityState.Unchanged.
  @param [mergeStrategy=MergeStrategy.Disallowed] {MergeStrategy} How the specified entity should be merged into the EntityManager if this EntityManager already contains an entity with the same key.
  @return {Entity} The attached entity.
  **/
  proto.attachEntity = function (entity, entityState, mergeStrategy) {
    assertParam(entity, "entity").isRequired().check();
    this.metadataStore._checkEntityType(entity);
    entityState = assertParam(entityState, "entityState").isEnumOf(EntityState).isOptional().check(EntityState.Unchanged);
    mergeStrategy = assertParam(mergeStrategy, "mergeStrategy").isEnumOf(MergeStrategy).isOptional().check(MergeStrategy.Disallowed);

    if (entity.entityType.metadataStore !== this.metadataStore) {
      throw new Error("Cannot attach this entity because the EntityType (" + entity.entityType.name +
          ") and MetadataStore associated with this entity does not match this EntityManager's MetadataStore.");
    }
    var aspect = entity.entityAspect;
    if (aspect) {
      // to avoid reattaching an entity in progress
      if (aspect._inProcessEntity) return aspect._inProcessEntity;
    } else {
      // this occur's when attaching an entity created via new instead of via createEntity.
      aspect = new EntityAspect(entity);
    }
    var manager = aspect.entityManager;
    if (manager) {
      if (manager === this) {
        return entity;
      } else {
        throw new Error("This entity already belongs to another EntityManager");
      }
    }

    var that = this;
    var attachedEntity;
    __using(this, "isLoading", true, function () {
      if (entityState.isAdded()) {
        checkEntityKey(that, entity);
      }
      // attachedEntity === entity EXCEPT in the case of a merge.
      attachedEntity = that._attachEntityCore(entity, entityState, mergeStrategy);
      aspect._inProcessEntity = attachedEntity;
      try {
        // entity ( not attachedEntity) is deliberate here.
        attachRelatedEntities(that, entity, entityState, mergeStrategy);
      } finally {
        // insure that _inProcessEntity is cleared.
        aspect._inProcessEntity = null;
      }
    });
    if (this.validationOptions.validateOnAttach) {
      attachedEntity.entityAspect.validateEntity();
    }
    if (!entityState.isUnchanged()) {
      this._notifyStateChange(attachedEntity, true);
    }
    this.entityChanged.publish({ entityAction: EntityAction.Attach, entity: attachedEntity });

    return attachedEntity;
  };


  /**
  Detaches an entity from this EntityManager.
  @example
      // assume em1 is an EntityManager containing a number of existing entities.
      // assume cust1 is a customer Entity previously attached to em1
      em1.detachEntity(cust1);
      // em1 will now no longer contain cust1 and cust1 will have an
      // entityAspect.entityState of EntityState.Detached
  @method detachEntity
  @param entity {Entity} The entity to detach.
  @return {Boolean} Whether the entity could be detached. This will return false if the entity is already detached or was never attached.
  **/
  proto.detachEntity = function (entity) {
    assertParam(entity, "entity").isEntity().check();
    var aspect = entity.entityAspect;
    if (!aspect) {
      // no aspect means in couldn't appear in any group
      return false;
    }

    if (aspect.entityManager !== this) {
      throw new Error("This entity does not belong to this EntityManager.");
    }
    return aspect.setDetached();
  };

  /**
  Fetches the metadata associated with the EntityManager's current 'serviceName'.  This call
  occurs internally before the first query to any service if the metadata hasn't already been
  loaded.
  @example
  Usually you will not actually process the results of a fetchMetadata call directly, but will instead
  ask for the metadata from the EntityManager after the fetchMetadata call returns.
  @example
      var em1 = new EntityManager( "breeze/NorthwindIBModel");
      em1.fetchMetadata()
        .then(function() {
            var metadataStore = em1.metadataStore;
            // do something with the metadata
        }).fail(function(exception) {
            // handle exception here
        });
  @method fetchMetadata
  @async
  @param [callback] {Function} Function called on success.

  successFunction([schema])
  @param [callback.schema] {Object} The raw Schema object from metadata provider - Because this schema will differ depending on the metadata provider
  it is usually better to access metadata via the 'metadataStore' property of the EntityManager after this method's Promise or callback completes.
  @param [errorCallback] {Function} Function called on failure.

  failureFunction([error])
  @param [errorCallback.error] {Error} Any error that occured wrapped into an Error object.
  @return {Promise}
    - Properties on the promise success result
      - schema {Object} The raw Schema object from metadata provider - Because this schema will differ depending on the metadata provider
        it is usually better to access metadata via the 'metadataStore' property of the EntityManager instead of using this 'raw' data.
  **/
  proto.fetchMetadata = function (dataService, callback, errorCallback) {
    if (typeof (dataService) === "function") {
      // legacy support for when dataService was not an arg. i.e. first arg was callback
      errorCallback = callback;
      callback = dataService;
      dataService = null;
    } else {
      assertParam(dataService, "dataService").isInstanceOf(DataService).isOptional().check();
      assertParam(callback, "callback").isFunction().isOptional().check();
      assertParam(errorCallback, "errorCallback").isFunction().isOptional().check();
    }

    var promise = this.metadataStore.fetchMetadata(dataService || this.dataService);
    return promiseWithCallbacks(promise, callback, errorCallback);
  };

  /**
  Executes the specified query.
  @example
  This method can be called using a 'promises' syntax ( recommended)
  @example
      var em = new EntityManager(serviceName);
      var query = new EntityQuery("Orders");
      em.executeQuery(query).then( function(data) {
          var orders = data.results;
          ... query results processed here
      }).fail( function(err) {
          ... query failure processed here
      });
  or with callbacks
  @example
      var em = new EntityManager(serviceName);
      var query = new EntityQuery("Orders");
      em.executeQuery(query,
          function(data) {
              var orders = data.results;
              ... query results processed here
          },
          function(err) {
              ... query failure processed here
          });
  Either way this method is the same as calling the The {{#crossLink "EntityQuery"}}{{/crossLink}} 'execute' method.
  @example
      var em = new EntityManager(serviceName);
      var query = new EntityQuery("Orders").using(em);
      query.execute().then( function(data) {
          var orders = data.results;
          ... query results processed here
      }).fail( function(err) {
          ... query failure processed here
      });

  @method executeQuery
  @async
  @param query {EntityQuery|String}  The {{#crossLink "EntityQuery"}}{{/crossLink}} or OData query string to execute.
  @param [callback] {Function} Function called on success.

  successFunction([data])
  @param callback.data {Object}
  @param callback.data.results {Array of Entity}
  @param callback.data.query {EntityQuery} The original query
  @param callback.data.entityManager {EntityManager} The EntityManager.
  @param callback.data.httpResponse {HttpResponse} The HttpResponse returned from the server.
  @param callback.data.inlineCount {Integer} Only available if 'inlineCount(true)' was applied to the query.  Returns the count of
  items that would have been returned by the query before applying any skip or take operators, but after any filter/where predicates
  would have been applied.
  @param callback.data.retrievedEntities {Array of Entity} All entities returned by the query.  Differs from results when .expand() is used.

  @param [errorCallback] {Function} Function called on failure.

  failureFunction([error])
  @param [errorCallback.error] {Error} Any error that occured wrapped into an Error object.
  @param [errorCallback.error.query] The query that caused the error.
  @param [errorCallback.error.entityManager] The query that caused the error.
  @param [errorCallback.error.httpResponse] {HttpResponse} The HttpResponse returned from the server.


  @return {Promise}
    - Properties on the promise success result
      - results {Array of Entity}
      - query {EntityQuery} The original query
      - entityManager {EntityManager} The EntityManager.
      - httpResponse {HttpResponse} The  HttpResponse returned from the server.
      - [inlineCount] {Integer} Only available if 'inlineCount(true)' was applied to the query.  Returns the count of
    items that would have been returned by the query before applying any skip or take operators, but after any filter/where predicates
    would have been applied.
  **/
  proto.executeQuery = function (query, callback, errorCallback) {
    assertParam(query, "query").isInstanceOf(EntityQuery).or().isString().check();
    assertParam(callback, "callback").isFunction().isOptional().check();
    assertParam(errorCallback, "errorCallback").isFunction().isOptional().check();
    var promise;
    // 'resolve' methods create a new typed object with all of its properties fully resolved against a list of sources.
    // Thought about creating a 'normalized' query with these 'resolved' objects
    // but decided not to because the 'query' may not be an EntityQuery (it can be a string) and hence might not have a queryOptions or dataServices property on it.
    var queryOptions = QueryOptions.resolve([ query.queryOptions, this.queryOptions, QueryOptions.defaultInstance]);
    var dataService = DataService.resolve([ query.dataService, this.dataService]);

    if ((!dataService.hasServerMetadata ) || this.metadataStore.hasMetadataFor(dataService.serviceName)) {
      promise = executeQueryCore(this, query, queryOptions, dataService);
    } else {
      var that = this;
      promise = this.fetchMetadata(dataService).then(function () {
        return executeQueryCore(that, query, queryOptions, dataService);
      });
    }

    return promiseWithCallbacks(promise, callback, errorCallback);
  };

  /**
  Executes the specified query against this EntityManager's local cache.

  @example
  Because this method is executed immediately there is no need for a promise or a callback
  @example
      var em = new EntityManager(serviceName);
      var query = new EntityQuery("Orders");
      var orders = em.executeQueryLocally(query);

  Note that this can also be accomplished using the 'executeQuery' method with
  a FetchStrategy of FromLocalCache and making use of the Promise or callback
  @example
      var em = new EntityManager(serviceName);
      var query = new EntityQuery("Orders").using(FetchStrategy.FromLocalCache);
      em.executeQuery(query).then( function(data) {
          var orders = data.results;
          ... query results processed here
      }).fail( function(err) {
          ... query failure processed here
      });
  @method executeQueryLocally
  @param query {EntityQuery}  The {{#crossLink "EntityQuery"}}{{/crossLink}} to execute.
  @return  {Array of Entity}  Array of entities from cache that satisfy the query
  **/
  proto.executeQueryLocally = function (query) {
    return executeQueryLocallyCore(this, query).results;
  }

  function executeQueryLocallyCore(em, query) {
    assertParam(query, "query").isInstanceOf(EntityQuery).check();

    var metadataStore = em.metadataStore;
    var entityType = query._getFromEntityType(metadataStore, true);
    // there may be multiple groups is this is a base entity type.
    var groups = findOrCreateEntityGroups(em, entityType);
    // filter then order then skip then take
    var filterFunc = query.wherePredicate && query.wherePredicate.toFunction({ entityType: entityType});

    var queryOptions = QueryOptions.resolve([ query.queryOptions, em.queryOptions, QueryOptions.defaultInstance]);
    var includeDeleted = queryOptions.includeDeleted === true;

    var newFilterFunc = function (entity) {
      return entity && (includeDeleted || !entity.entityAspect.entityState.isDeleted()) && (filterFunc ? filterFunc(entity) : true);
    };

    var result = [];
    // TODO: mapMany
    groups.forEach(function (group) {
      var entities = group._entities.filter(newFilterFunc);
      if (entities.length) {
          result = result.length ? result.concat(entities) : entities;
      }
    });

    var orderByComparer = query.orderByClause && query.orderByClause.getComparer(entityType);
    if (orderByComparer) {
      result.sort(orderByComparer);
    }

    if (query.inlineCountEnabled) {
      var inlineCount = result.length;
    }

    var skipCount = query.skipCount;
    if (skipCount) {
      result = result.slice(skipCount);
    }
    var takeCount = query.takeCount;
    if (takeCount) {
      result = result.slice(0, takeCount);
    }

    var selectClause = query.selectClause;
    if (selectClause) {
      var selectFn = selectClause.toFunction();
      result = result.map(selectFn);
    }
    return {results: result, inlineCount: inlineCount};
  };

  /**
  Saves either a list of specified entities or all changed entities within this EntityManager. If there are no changes to any of the entities
  specified then there will be no server side call made but a valid 'empty' saveResult will still be returned.
  @example
  Often we will be saving all of the entities within an EntityManager that are either added, modified or deleted
  and we will let the 'saveChanges' call determine which entities these are.
  @example
      // assume em1 is an EntityManager containing a number of preexisting entities.
      // This could include added, modified and deleted entities.
      em.saveChanges().then(function(saveResult) {
          var savedEntities = saveResult.entities;
          var keyMappings = saveResult.keyMappings;
      }).fail(function (e) {
          // e is any exception that was thrown.
      });
  But we can also control exactly which entities to save and can specify specific SaveOptions
  @example
      // assume entitiesToSave is an array of entities to save.
      var saveOptions = new SaveOptions({ allowConcurrentSaves: true });
      em.saveChanges(entitiesToSave, saveOptions).then(function(saveResult) {
          var savedEntities = saveResult.entities;
          var keyMappings = saveResult.keyMappings;
      }).fail(function (e) {
          // e is any exception that was thrown.
      });
  Callback methods can also be used
  @example
      em.saveChanges(entitiesToSave, null,
      function(saveResult) {
                  var savedEntities = saveResult.entities;
                  var keyMappings = saveResult.keyMappings;
              }, function (e) {
                  // e is any exception that was thrown.
              }
      );
  @method saveChanges
  @async
  @param [entities] {Array of Entity} The list of entities to save.
  Every entity in that list will be sent to the server, whether changed or unchanged,
  as long as it is attached to this EntityManager.
  If this parameter is omitted, null or empty (the usual case),
  every entity with pending changes in this EntityManager will be saved.
  @param [saveOptions] {SaveOptions} {{#crossLink "SaveOptions"}}{{/crossLink}} for the save - will default to
  {{#crossLink "EntityManager/saveOptions"}}{{/crossLink}} if null.
  @param [callback] {Function} Function called on success.

  successFunction([saveResult])
  @param [callback.saveResult] {Object}
  @param [callback.saveResult.entities] {Array of Entity} The saved entities - with any temporary keys converted into 'real' keys.
  These entities are actually references to entities in the EntityManager cache that have been updated as a result of the
  save.
  @param [callback.saveResult.keyMappings] {Array of keyMappings} Each keyMapping has the following properties: 'entityTypeName', 'tempValue' and 'realValue'
  @param [callback.saveResult.httpResponse] {HttpResponse} The raw HttpResponse returned from the server.

  @param [errorCallback] {Function} Function called on failure.

  failureFunction([error])
  @param [errorCallback.error] {Error} Any error that occured wrapped into an Error object.
  @param [errorCallback.error.entityErrors] { Array of server side errors }  These are typically validation errors but are generally any error that can be easily isolated to a single entity.
  @param [errorCallback.error.httpResponse] {HttpResponse} The raw HttpResponse returned from the server.
  @param [errorCallback.error.saveResult] {Object} Some dataservice adapters return a 'saveResult' object
  when the failing save operation is non-transactional meaning some entities could be saved while others were not.
  The 'saveResult' object identifies both that entities that were saved (with their keyMapping)
  and that entities that were not saved (with their errors).

  @return {Promise} Promise
  **/
  proto.saveChanges = function (entities, saveOptions, callback, errorCallback) {
    assertParam(entities, "entities").isOptional().isArray().isEntity().check();
    assertParam(saveOptions, "saveOptions").isInstanceOf(SaveOptions).isOptional().check();
    assertParam(callback, "callback").isFunction().isOptional().check();
    assertParam(errorCallback, "errorCallback").isFunction().isOptional().check();

    saveOptions = saveOptions || this.saveOptions || SaveOptions.defaultInstance;
    var isFullSave = entities == null;
    var entitiesToSave = getEntitiesToSave(this, entities);

    if (entitiesToSave.length === 0) {
      var result = { entities: [], keyMappings: [] };
      if (callback) callback(result);
      return Q.resolve(result);
    }

    if (!saveOptions.allowConcurrentSaves) {
      var anyPendingSaves = entitiesToSave.some(function (entity) {
        return entity.entityAspect.isBeingSaved;
      });
      if (anyPendingSaves) {
        var err = new Error("Concurrent saves not allowed - SaveOptions.allowConcurrentSaves is false");
        if (errorCallback) errorCallback(err);
        return Q.reject(err);
      }
    }

    clearServerErrors(entitiesToSave);

    var valError = this.saveChangesValidateOnClient(entitiesToSave);
    if (valError) {
      if (errorCallback) errorCallback(valError);
      return Q.reject(valError);
    }

    var dataService = DataService.resolve([saveOptions.dataService, this.dataService]);
    var saveContext = {
      entityManager: this,
      dataService: dataService,
      processSavedEntities: processSavedEntities,
      resourceName: saveOptions.resourceName || this.saveOptions.resourceName || "SaveChanges"
    };

    // TODO: need to check that if we are doing a partial save that all entities whose temp keys
    // are referenced are also in the partial save group

    var saveBundle = { entities: entitiesToSave, saveOptions: saveOptions };


    try { // Guard against exception thrown in dataservice adapter before it goes async
      updateConcurrencyProperties(entitiesToSave);
      return dataService.adapterInstance.saveChanges(saveContext, saveBundle)
          .then(saveSuccess).then(null, saveFail);
    } catch (err) {
      // undo the marking by updateConcurrencyProperties
      markIsBeingSaved(entitiesToSave, false);
      if (errorCallback) errorCallback(err);
      return Q.reject(err);
    }

    function saveSuccess(saveResult) {
      var em = saveContext.entityManager;
      markIsBeingSaved(entitiesToSave, false);
      var savedEntities = saveResult.entities = saveContext.processSavedEntities(saveResult);

      // update _hasChanges after save.
      em._setHasChanges(null);

      // can't do this anymore because other changes might have been made while saved entities in flight.
//      var hasChanges = (isFullSave && haveSameContents(entitiesToSave, savedEntities)) ? false : null;
//      em._setHasChanges(hasChanges);

      if (callback) callback(saveResult);
      return Q.resolve(saveResult);
    }

    function processSavedEntities(saveResult) {

      var savedEntities = saveResult.entities;

      if (savedEntities.length === 0) {
        return [];
      }
      var keyMappings = saveResult.keyMappings;
      var em = saveContext.entityManager;

      // must occur outside of isLoading block
      fixupKeys(em, keyMappings);

      __using(em, "isLoading", true, function () {

        var mappingContext = new MappingContext({
          query: null, // tells visitAndMerge this is a save instead of a query
          entityManager: em,
          mergeOptions: { mergeStrategy: MergeStrategy.OverwriteChanges },
          dataService: dataService
        });

        // The visitAndMerge operation has been optimized so that we do not actually perform a merge if the
        // the save operation did not actually return the entity - i.e. during OData and Mongo updates and deletes.
        savedEntities = mappingContext.visitAndMerge(savedEntities, { nodeType: "root" });
      });

      return savedEntities;
    }

    function saveFail(error) {
      markIsBeingSaved(entitiesToSave, false);
      processServerErrors(saveContext, error);
      if (errorCallback) errorCallback(error);
      return Q.reject(error);
    }
  };

  /**
  Run the "saveChanges" pre-save client validation logic.

  This is NOT a general purpose validation method.
  It is intended for utilities that must know if saveChanges
  would reject the save due to client validation errors.

  It only validates entities if the EntityManager's
  {{#crossLink "ValidationOptions"}}{{/crossLink}}.validateOnSave is true.

  @method saveChangesValidateOnClient
  @param entitiesToSave {Array of Entity} The list of entities to save (to validate).
  @return {Error} Validation error or null if no error
  **/
  proto.saveChangesValidateOnClient = function(entitiesToSave) {

    if (this.validationOptions.validateOnSave) {
      var failedEntities = entitiesToSave.filter(function (entity) {
        var aspect = entity.entityAspect;
        var isValid = aspect.entityState.isDeleted() || aspect.validateEntity();
        return !isValid;
      });
      if (failedEntities.length > 0) {
        var valError = new Error("Client side validation errors encountered - see the entityErrors collection on this object for more detail");
        valError.entityErrors = createEntityErrors(failedEntities);
        return valError;
      }
    }
    return null;
  }

  function clearServerErrors(entities) {
    entities.forEach(function (entity) {
      var serverKeys = [];
      var aspect = entity.entityAspect;
      __objectForEach(aspect._validationErrors, function (key, ve) {
        if (ve.isServerError) serverKeys.push(key);
      });
      if (serverKeys.length === 0) return;
      aspect._processValidationOpAndPublish(function () {
        serverKeys.forEach(function (key) {
          aspect._removeValidationError(key);
        });
      });
    });
  }

  function createEntityErrors(entities) {
    var entityErrors = [];
    entities.forEach(function (entity) {
      __objectForEach(entity.entityAspect._validationErrors, function (key, ve) {
        var cfg = __extend({
          entity: entity,
          errorName: ve.validator.name
        }, ve, ["errorMessage", "propertyName", "isServerError"]);
        entityErrors.push(cfg);
      });
    });
    return entityErrors;
  }


  function processServerErrors(saveContext, error) {
    var serverErrors = error.entityErrors;
    if (!serverErrors) return;
    var entityManager = saveContext.entityManager;
    var metadataStore = entityManager.metadataStore;
    error.entityErrors = serverErrors.map(function (serr) {
      var entity = null;
      if (serr.keyValues) {
        var entityType = metadataStore._getEntityType(serr.entityTypeName);
        var ekey = new EntityKey(entityType, serr.keyValues);
        entity = entityManager.findEntityByKey(ekey);
      }

      if (entity) {
        var context = serr.propertyName ?
                      {
                        propertyName: serr.propertyName,
                        property: entityType.getProperty(serr.propertyName)
                      } : {
                      };
        var key = ValidationError.getKey(serr.errorName || serr.errorMessage, serr.propertyName);

        var ve = new ValidationError(null, context, serr.errorMessage, key);
        ve.isServerError = true;
        entity.entityAspect.addValidationError(ve);
      }

      var entityError = __extend({
        entity: entity,
        isServerError: true
      }, serr, ["errorName", "errorMessage", "propertyName"]);
      return entityError;
    });
  }

  // No longer used
//  function haveSameContents(arr1, arr2) {
//    if (arr1.length !== arr2.length) {
//      return false;
//    }
//    for (var i = 0, c = arr1.length; i < c; i++) {
//      if (arr1[i] !== arr2[i]) return false;
//    }
//    return true;
//  }


  proto._findEntityGroup = function (entityType) {
    return this._entityGroupMap[entityType.name];
  };


  /**
  Attempts to locate an entity within this EntityManager by its key.
  @example
      // assume em1 is an EntityManager containing a number of preexisting entities.
      var employee = em1.getEntityByKey("Employee", 1);
      // employee will either be an entity or null.
  @method getEntityByKey
  @param typeName {EntityType | String} The EntityType or EntityType name for this key.
  @param keyValues {Object|Array of Object} The values for this key - will usually just be a single value; an array is only needed for multipart keys.
  @return {Entity} An Entity or null;
  **/

  /**
  Attempts to locate an entity within this EntityManager by its  {{#crossLink "EntityKey"}}{{/crossLink}}.
  @example
      // assume em1 is an EntityManager containing a number of preexisting entities.
      var employeeType = em1.metadataStore.getEntityType("Employee");
      var employeeKey = new EntityKey(employeeType, 1);
      var employee = em1.getEntityByKey(employeeKey);
      // employee will either be an entity or null.
  @method getEntityByKey - overload
  @param entityKey {EntityKey} The  {{#crossLink "EntityKey"}}{{/crossLink}} of the Entity to be located.
  @return {Entity} An Entity or null;
  **/
  proto.getEntityByKey = function () {
    var entityKey = createEntityKey(this, arguments).entityKey;
    var entityTypes = entityKey._subtypes || [entityKey.entityType];
    var ek = null;
    // hack use of some to simulate mapFirst logic.
    entityTypes.some(function (et) {
      var group = this._findEntityGroup(et);
      // group version of findEntityByKey doesn't care about entityType
      ek = group && group.findEntityByKey(entityKey);
      return ek;
    }, this);
    return ek;
  };

  /**
  Attempts to fetch an entity from the server by its key with
  an option to check the local cache first. Note the this EntityManager's queryOptions.mergeStrategy
  will be used to merge any server side entity returned by this method.
  @example
      // assume em1 is an EntityManager containing a number of preexisting entities.
      em1.fetchEntityByKey("Employee", 1).then(function(result) {
          var employee = result.entity;
          var entityKey = result.entityKey;
          var fromCache = result.fromCache;
      });
  @method fetchEntityByKey
  @async
  @param typeName {EntityType | String} The EntityType or EntityType name for this key.
  @param keyValues {Object|Array of Object} The values for this key - will usually just be a single value; an array is only needed for multipart keys.
  @param checkLocalCacheFirst {Boolean=false} Whether to check this EntityManager first before going to the server. By default, the query will NOT do this.
  @return {Promise}
    - Properties on the promise success result
      - entity {Object} The entity returned or null
      - entityKey {EntityKey} The entityKey of the entity to fetch.
      - fromCache {Boolean} Whether this entity was fetched from the server or was found in the local cache.

  **/

  /**
  Attempts to fetch an entity from the server by its {{#crossLink "EntityKey"}}{{/crossLink}} with
  an option to check the local cache first.
  @example
      // assume em1 is an EntityManager containing a number of preexisting entities.
      var employeeType = em1.metadataStore.getEntityType("Employee");
      var employeeKey = new EntityKey(employeeType, 1);
      em1.fetchEntityByKey(employeeKey).then(function(result) {
          var employee = result.entity;
          var entityKey = result.entityKey;
          var fromCache = result.fromCache;
      });
  @method fetchEntityByKey - overload
  @async
  @param entityKey {EntityKey} The  {{#crossLink "EntityKey"}}{{/crossLink}} of the Entity to be located.
  @param checkLocalCacheFirst {Boolean=false} Whether to check this EntityManager first before going to the server. By default, the query will NOT do this.
  @return {Promise}
    - Properties on the promise success result
      - entity {Object} The entity returned or null
      - entityKey {EntityKey} The entityKey of the entity to fetch.
      - fromCache {Boolean} Whether this entity was fetched from the server or was found in the local cache.
  **/
  proto.fetchEntityByKey = function () {
    var dataService = DataService.resolve([this.dataService]);
    if ((!dataService.hasServerMetadata) || this.metadataStore.hasMetadataFor(dataService.serviceName)) {
      return fetchEntityByKeyCore(this, arguments);
    } else {
      var that = this;
      var args = arguments;
      return this.fetchMetadata(dataService).then(function () {
        return fetchEntityByKeyCore(that, args);
      });
    }
  };

  function fetchEntityByKeyCore(em, args) {
    var tpl = createEntityKey(em, args);
    var entityKey = tpl.entityKey;
    var checkLocalCacheFirst = tpl.remainingArgs.length === 0 ? false : !!tpl.remainingArgs[0];
    var entity;
    var foundIt = false;
    if (checkLocalCacheFirst) {
      entity = em.getEntityByKey(entityKey);
      foundIt = !!entity;
      if (foundIt &&
        // null the entity if it is deleted and we should exclude deleted entities
          !em.queryOptions.includeDeleted && entity.entityAspect.entityState.isDeleted()) {
        entity = null;
        // but resume looking if we'd overwrite deleted entity with a remote entity
        // note: em.queryOptions is always fully resolved by now
        foundIt = em.queryOptions.mergeStrategy !== MergeStrategy.OverwriteChanges;
      }
    }
    if (foundIt) {
      return Q.resolve({ entity: entity, entityKey: entityKey, fromCache: true });
    } else {
      return EntityQuery.fromEntityKey(entityKey).using(em).execute().then(function (data) {
        entity = (data.results.length === 0) ? null : data.results[0];
        return Q.resolve({ entity: entity, entityKey: entityKey, fromCache: false });
      });
    }
  };

  /**
  [Deprecated] - Attempts to locate an entity within this EntityManager by its  {{#crossLink "EntityKey"}}{{/crossLink}}.
  @example
      // assume em1 is an EntityManager containing a number of preexisting entities.
      var employeeType = em1.metadataStore.getEntityType("Employee");
      var employeeKey = new EntityKey(employeeType, 1);
      var employee = em1.findEntityByKey(employeeKey);
      // employee will either be an entity or null.
  @method findEntityByKey
  @deprecated - use getEntityByKey instead
  @param entityKey {EntityKey} The  {{#crossLink "EntityKey"}}{{/crossLink}} of the Entity to be located.
  @return {Entity} An Entity or null;
  **/
  proto.findEntityByKey = function (entityKey) {
    return this.getEntityByKey(entityKey);
  };

  /**
  Generates a temporary key for the specified entity.  This is used to insure that newly
  created entities have unique keys and to register that these keys are temporary and
  need to be automatically replaced with 'real' key values once these entities are saved.

  The EntityManager.keyGeneratorCtor property is used internally by this method to actually generate
  the keys - See the  {{#crossLink "_keyGenerator_interface"}}{{/crossLink}} interface description to see
  how a custom key generator can be plugged in.
  @example
      // assume em1 is an EntityManager containing a number of preexisting entities.
      var custType = em1.metadataStore.getEntityType("Customer");
      var customer = custType.createEntity();
      var customerId = em.generateTempKeyValue(customer);
      // The 'customer' entity 'CustomerID' property is now set to a newly generated unique id value
      // This property will change again after a successful save of the 'customer' entity.

      em1.saveChanges().then( function( data) {
          var sameCust1 = data.results[0];
          // cust1 === sameCust1;
          // but cust1.getProperty("CustomerId") != customerId
          // because the server will have generated a new id
          // and the client will have been updated with this
          // new id.
      })

  @method generateTempKeyValue
  @param entity {Entity} The Entity to generate a key for.
  @return {Object} The new key value
  **/
  proto.generateTempKeyValue = function (entity) {
    // TODO - check if this entity is attached to this EntityManager.
    assertParam(entity, "entity").isEntity().check();
    var entityType = entity.entityType;
    var nextKeyValue = this.keyGenerator.generateTempKeyValue(entityType);
    var keyProp = entityType.keyProperties[0];
    entity.setProperty(keyProp.name, nextKeyValue);
    entity.entityAspect.hasTempKey = true;
    return nextKeyValue;
  };

  /**
  Returns whether there are any changed entities of the specified {{#crossLink "EntityType"}}{{/crossLink}}s. A 'changed' Entity has
  has an {{#crossLink "EntityState"}}{{/crossLink}} of either Added, Modified or Deleted.
  @example
  This method can be used to determine if an EntityManager has any changes
  @example
      // assume em1 is an EntityManager containing a number of preexisting entities.
      if ( em1.hasChanges() {
          // do something interesting
      }
  or if it has any changes on to a specific {{#crossLink "EntityType"}}{{/crossLink}}
  @example
      // assume em1 is an EntityManager containing a number of preexisting entities.
      var custType = em1.metadataStore.getEntityType("Customer");
      if ( em1.hasChanges(custType) {
          // do something interesting
      }
  or to a collection of {{#crossLink "EntityType"}}{{/crossLink}}s
  @example
      // assume em1 is an EntityManager containing a number of preexisting entities.
      var custType = em1.metadataStore.getEntityType("Customer");
      var orderType = em1.metadataStore.getEntityType("Order");
      if ( em1.hasChanges( [custType, orderType]) {
          // do something interesting
      }
  @method hasChanges
  @param [entityTypes] {String|Array of String|EntityType|Array of EntityType} The {{#crossLink "EntityType"}}{{/crossLink}}s for which 'changed' entities will be found.
  If this parameter is omitted, all EntityTypes are searched. String parameters are treated as EntityType names.
  @return {Boolean} Whether there were any changed entities.
  **/
  proto.hasChanges = function (entityTypes) {
    if (!this._hasChanges) return false;
    if (entityTypes === undefined) return this._hasChanges;
    return this._hasChangesCore(entityTypes);
  };

  /**
  An {{#crossLink "Event"}}{{/crossLink}} that fires whenever an EntityManager transitions to or from having changes.
  @example
      var em = new EntityManager( {serviceName: "breeze/NorthwindIBModel" });
      em.hasChangesChanged.subscribe(function(args) {
              var hasChangesChanged = args.hasChanges;
              var entityManager = args.entityManager;
          });
      });

  @event hasChangesChanged
  @param entityManager {EntityManager} The EntityManager whose 'hasChanges' status has changed.
  @param hasChanges {Boolean} Whether or not this EntityManager has changes.
  @readOnly
  **/


  // backdoor to "really" check for changes.
  proto._hasChangesCore = function (entityTypes) {
    entityTypes = checkEntityTypes(this, entityTypes);
    var entityGroups = getEntityGroups(this, entityTypes);
    return entityGroups.some(function (eg) {
      return eg && eg.hasChanges();
    });
  };

  /**
  Returns a array of all changed entities of the specified {{#crossLink "EntityType"}}{{/crossLink}}s. A 'changed' Entity has
  has an {{#crossLink "EntityState"}}{{/crossLink}} of either Added, Modified or Deleted.
  @example
  This method can be used to get all of the changed entities within an EntityManager
  @example
      // assume em1 is an EntityManager containing a number of preexisting entities.
      var changedEntities = em1.getChanges();
  or you can specify that you only want the changes on a specific {{#crossLink "EntityType"}}{{/crossLink}}
  @example
      // assume em1 is an EntityManager containing a number of preexisting entities.
      var custType = em1.metadataStore.getEntityType("Customer");
      var changedCustomers = em1.getChanges(custType);
  or to a collection of {{#crossLink "EntityType"}}{{/crossLink}}s
  @example
      // assume em1 is an EntityManager containing a number of preexisting entities.
      var custType = em1.metadataStore.getEntityType("Customer");
      var orderType = em1.metadataStore.getEntityType("Order");
      var changedCustomersAndOrders = em1.getChanges([custType, orderType]);
  @method getChanges
  @param [entityTypes] {String|Array of String|EntityType|Array of EntityType} The {{#crossLink "EntityType"}}{{/crossLink}}s for which 'changed' entities will be found.
  If this parameter is omitted, all EntityTypes are searched. String parameters are treated as EntityType names.
  @return {Array of Entity} Array of Entities
  **/
  proto.getChanges = function (entityTypes) {
    entityTypes = checkEntityTypes(this, entityTypes);
    return getChangesCore(this, entityTypes);
  };

  /**
  Rejects (reverses the effects) all of the additions, modifications and deletes from this EntityManager.
  Calls EntityAspect.rejectChanges on every changed entity in this EntityManager.
  @example
      // assume em1 is an EntityManager containing a number of preexisting entities.
      var entities = em1.rejectChanges();

  @method rejectChanges
  @return {Array of Entity} The entities whose changes were rejected. These entities will all have EntityStates of
  either 'Unchanged' or 'Detached'
  **/
  proto.rejectChanges = function () {
    if (!this._hasChanges) return [];
    var changes = getChangesCore(this, null);
    // next line stops individual reject changes from each calling _hasChangesCore
    var aspects = changes.map(function(e) {
      return e.entityAspect._checkOperation("rejectChanges");
    });
    this._hasChanges = false;
    aspects.forEach(function (aspect) {
      aspect.rejectChanges();
    });
    this.hasChangesChanged.publish({ entityManager: this, hasChanges: false });
    return changes;
  };

  /**
  Returns a array of all entities of the specified {{#crossLink "EntityType"}}{{/crossLink}}s with the specified {{#crossLink "EntityState"}}{{/crossLink}}s.
  @example
  This method can be used to get all of the entities within an EntityManager
  @example
      // assume em1 is an EntityManager containing a number of preexisting entities.
      var entities = em1.getEntities();
  or you can specify that you only want the changes on a specific {{#crossLink "EntityType"}}{{/crossLink}}
  @example
      // assume em1 is an EntityManager containing a number of preexisting entities.
      var custType = em1.metadataStore.getEntityType("Customer");
      var customers = em1.getEntities(custType);
  or to a collection of {{#crossLink "EntityType"}}{{/crossLink}}s
  @example
      // assume em1 is an EntityManager containing a number of preexisting entities.
      var custType = em1.metadataStore.getEntityType("Customer");
      var orderType = em1.metadataStore.getEntityType("Order");
      var customersAndOrders = em1.getChanges([custType, orderType]);
  You can also ask for entities with a particular {{#crossLink "EntityState"}}{{/crossLink}} or EntityStates.
  @example
      // assume em1 is an EntityManager containing a number of preexisting entities.
      var custType = em1.metadataStore.getEntityType("Customer");
      var orderType = em1.metadataStore.getEntityType("Order");
      var addedCustomersAndOrders = em1.getEntities([custType, orderType], EntityState.Added);
  @method getEntities
  @param [entityTypes] {String|Array of String|EntityType|Array of EntityType} The {{#crossLink "EntityType"}}{{/crossLink}}s for which entities will be found.
  If this parameter is omitted, all EntityTypes are searched. String parameters are treated as EntityType names.
  @param [entityState] {EntityState|Array of EntityState} The {{#crossLink "EntityState"}}{{/crossLink}}s for which entities will be found.
  If this parameter is omitted, entities of all EntityStates are returned.
  @return {Array of Entity} Array of Entities
  **/
  proto.getEntities = function (entityTypes, entityStates) {
    entityTypes = checkEntityTypes(this, entityTypes);
    assertParam(entityStates, "entityStates").isOptional().isEnumOf(EntityState).or().isNonEmptyArray().isEnumOf(EntityState).check();

    entityStates = entityStates && validateEntityStates(this, entityStates);
    return getEntitiesCore(this, entityTypes, entityStates);
  };


  // protected methods

  proto._notifyStateChange = function (entity, needsSave) {
    var ecArgs = { entityAction: EntityAction.EntityStateChange, entity: entity };

    if (needsSave) {
      if (!this._hasChanges) this._setHasChanges(true);
    } else {
      // called when rejecting a change or merging an unchanged record.
      // NOTE: this can be slow with lots of entities in the cache.
      // so defer it during a query/import or save and call it once when complete ( if needed).
      if (this._hasChanges) {
        if (this.isLoading) {
          this._hasChangesAction = this._hasChangesAction || function () {
            this._setHasChanges(null);
            this.entityChanged.publish(ecArgs);
          }.bind(this);
          return;
        } else {
          this._setHasChanges(null);
        }
      }
    }
    this.entityChanged.publish(ecArgs);
  };

  proto._setHasChanges = function (hasChanges) {
    if (hasChanges == null) hasChanges = this._hasChangesCore();
    var hadChanges = this._hasChanges;
    this._hasChanges = hasChanges;
    if (hasChanges != hadChanges) {
      this.hasChangesChanged.publish({ entityManager: this, hasChanges: hasChanges });
    }
    this._hasChangesAction = null;
  }

  proto._linkRelatedEntities = function (entity) {
    var em = this;
    var entityAspect = entity.entityAspect;
    // we do not want entityState to change as a result of linkage.
    __using(em, "isLoading", true, function () {

      var unattachedMap = em._unattachedChildrenMap;
      var entityKey = entityAspect.getKey();

      // attach any unattachedChildren
      var tuples = unattachedMap.getTuples(entityKey);
      if (tuples) {
        tuples.slice(0).forEach(function (tpl) {

          var unattachedChildren = tpl.children.filter(function (e) {
            return e.entityAspect.entityState !== EntityState.Detached;
          });

          var childToParentNp, parentToChildNp;

          // np is usually childToParentNp
          // except with unidirectional 1-n where it is parentToChildNp;
          var np = tpl.navigationProperty;

          if (np.inverse) {
            // bidirectional
            childToParentNp = np;
            parentToChildNp = np.inverse;

            if (parentToChildNp.isScalar) {
              var onlyChild = unattachedChildren[0];
              entity.setProperty(parentToChildNp.name, onlyChild);
              onlyChild.setProperty(childToParentNp.name, entity);
            } else {
              var currentChildren = entity.getProperty(parentToChildNp.name);
              unattachedChildren.forEach(function (child) {
                currentChildren.push(child);
                child.setProperty(childToParentNp.name, entity);
              });
            }
          } else {
            // unidirectional
            // if (np.isScalar || np.parentType !== entity.entityType) {
            if (np.isScalar) {
              // n -> 1  eg: child: OrderDetail parent: Product
              // 1 -> 1 eg child: Employee parent: Employee ( only Manager, no DirectReports property)
              childToParentNp = np;
              unattachedChildren.forEach(function (child) {
                child.setProperty(childToParentNp.name, entity);
              });
            } else {
              // 1 -> n  eg: parent: Region child: Terr
              // TODO: need to remove unattached children from the map after this; only a perf issue.
              parentToChildNp = np;
              var currentChildren = entity.getProperty(parentToChildNp.name);
              unattachedChildren.forEach(function (child) {
                // we know if can't already be there.
                currentChildren._push(child);
              });
            }
          }
          unattachedMap.removeChildren(entityKey, childToParentNp);
        });
      }


      // now add to unattachedMap if needed.
      entity.entityType.navigationProperties.forEach(function (np) {
        if (np.isScalar) {
          var value = entity.getProperty(np.name);
          // property is already linked up
          if (value) return;
        }

        // first determine if np contains a parent or child
        // having a parentKey means that this is a child
        // if a parent then no need for more work because children will attach to it.
        var parentKey = entityAspect.getParentKey(np);
        if (parentKey) {
          // check for empty keys - meaning that parent id's are not yet set.
          if (parentKey._isEmpty()) return;
          // if a child - look for parent in the em cache
          var parent = em.findEntityByKey(parentKey);
          if (parent) {
            // if found hook it up
            entity.setProperty(np.name, parent);
          } else {
            // else add parent to unresolvedParentMap;
            unattachedMap.addChild(parentKey, np, entity);
          }
        }
      });

      // handle unidirectional 1-x where we set x.fk
      entity.entityType.foreignKeyProperties.forEach(function (fkProp) {
        var invNp = fkProp.inverseNavigationProperty;
        if (!invNp) return;
        // unidirectional fk props only
        var fkValue = entity.getProperty(fkProp.name);
        var parentKey = new EntityKey(invNp.parentType, [fkValue]);
        var parent = em.findEntityByKey(parentKey);

        if (parent) {
          if (invNp.isScalar) {
            parent.setProperty(invNp.name, entity);
          } else {
            if (em.isLoading) {
              parent.getProperty(invNp.name)._push(entity);
            } else {
              parent.getProperty(invNp.name).push(entity);
            }
          }
        } else {
          // else add parent to unresolvedParentMap;
          unattachedMap.addChild(parentKey, invNp, entity);
        }
      });
    });
  };

  // private fns

  // takes in entityTypes as either strings or entityTypes or arrays of either
  // and returns either an entityType or an array of entityTypes or throws an error
  function checkEntityTypes(em, entityTypes) {
    assertParam(entityTypes, "entityTypes").isString().isOptional().or().isNonEmptyArray().isString()
        .or().isInstanceOf(EntityType).or().isNonEmptyArray().isInstanceOf(EntityType).check();
    if (typeof entityTypes === "string") {
      entityTypes = em.metadataStore._getEntityType(entityTypes, false);
    } else if (Array.isArray(entityTypes) && typeof entityTypes[0] === "string") {
      entityTypes = entityTypes.map(function (etName) {
        return em.metadataStore._getEntityType(etName, false);
      });
    }
    return entityTypes;
  }

  function getChangesCore(em, entityTypes) {
    var entityGroups = getEntityGroups(em, entityTypes);

    // TODO: think about writing a core.mapMany method if we see more of these.
    var selected;
    entityGroups.forEach(function (eg) {
      // eg may be undefined or null
      if (!eg) return;
      var entities = eg.getChanges();
      if (selected) {
        selected.push.apply(selected, entities);
      } else {
        selected = entities;
      }
    });
    return selected || [];
  }

  function getEntitiesCore(em, entityTypes, entityStates) {
    var entityGroups = getEntityGroups(em, entityTypes);

    // TODO: think about writing a core.mapMany method if we see more of these.
    var selected;
    entityGroups.forEach(function (eg) {
      // eg may be undefined or null
      if (!eg) return;
      var entities = eg.getEntities(entityStates);
      if (selected) {
        selected.push.apply(selected, entities);
      } else {
        selected = entities;
      }
    });
    return selected || [];
  }

  function createEntityKey(em, args) {
    try {
      if (args[0] instanceof EntityKey) {
        return { entityKey: args[0], remainingArgs: __arraySlice(args, 1) };
      } else if (args.length >= 2) {
        var entityType = (typeof args[0] === 'string') ? em.metadataStore._getEntityType(args[0], false) : args[0];
        return { entityKey: new EntityKey(entityType, args[1]), remainingArgs: __arraySlice(args, 2) };
      }
    } catch (e) {/* throw below */
    }
    throw new Error("Must supply an EntityKey OR an EntityType name or EntityType followed by a key value or an array of key values.");
  }

  function markIsBeingSaved(entities, flag) {
    entities.forEach(function (entity) {
      entity.entityAspect.isBeingSaved = flag;
    });
  }

  function exportEntityGroups(em, entities) {
    var entityGroupMap;
    var first = entities && entities[0];
    if (first) {
      // group entities by entityType and
      // create 'groups' that look like entityGroups.
      entityGroupMap = {};
      if (first.entityType) {
        // assume "entities" is an array of entities;
        entities.forEach(function (e) {
          if (e.entityAspect.entityState == EntityState.Detached) {
            throw new Error("Unable to export an entity with an EntityState of 'Detached'");
          }
          var group = entityGroupMap[e.entityType.name];
          if (!group) {
            group = {};
            group.entityType = e.entityType;
            group._entities = [];
            entityGroupMap[e.entityType.name] = group;
          }
          group._entities.push(e);
        });
      } else {
        // assume "entities" is an array of EntityTypes (or names)
        var entityTypes = checkEntityTypes(em, entities)
        entityTypes.forEach(function(et){
          var group = em._entityGroupMap[et.name];
          if (group && group._entities.length) {
            entityGroupMap[et.name] = group;
          }
        })
      }
    } else if (entities && entities.length === 0) {
      // empty array = export nothing
      entityGroupMap = {};
    } else {
      entityGroupMap = em._entityGroupMap;
    }

    var tempKeys = [];
    var newGroupMap = {};
    __objectForEach(entityGroupMap, function (entityTypeName, entityGroup) {
      newGroupMap[entityTypeName] = exportEntityGroup(entityGroup, tempKeys);
    });

    return { entityGroupMap: newGroupMap, tempKeys: tempKeys };
  }

  function exportEntityGroup(entityGroup, tempKeys) {
    var resultGroup = {};
    var entityType = entityGroup.entityType;
    var dps = entityType.dataProperties;
    var serializerFn = getSerializerFn(entityType);
    var rawEntities = [];
    entityGroup._entities.forEach(function (entity) {
      if (entity) {
        var rawEntity = structuralObjectToJson(entity, dps, serializerFn, tempKeys);
        rawEntities.push(rawEntity);
      }
    });
    resultGroup.entities = rawEntities;
    return resultGroup;
  }

  function structuralObjectToJson(so, dps, serializerFn, tempKeys) {

    var result = {};
    dps.forEach(function (dp) {
      var dpName = dp.name;
      var value = so.getProperty(dpName);
      if (value == null && dp.defaultValue == null) return;

      if (value && dp.isComplexProperty) {
        var coDps = dp.dataType.dataProperties;
        value = __map(value, function (v) {
          return structuralObjectToJson(v, coDps, serializerFn);
        });
      } else {
        value = serializerFn ? serializerFn(dp, value) : value;
        if (dp.isUnmapped) {
          value = __toJSONSafe(value);
        }
      }
      if (value === undefined) return;
      result[dpName] = value;
    });
    var aspect, newAspect;
    if (so.entityAspect) {
      aspect = so.entityAspect;
      var entityState = aspect.entityState;
      newAspect = {
        tempNavPropNames: exportTempKeyInfo(aspect, tempKeys),
        entityState: entityState.name
      };
      if (aspect.extraMetadata) {
        newAspect.extraMetadata = aspect.extraMetadata;
      }
      if (entityState.isModified() || entityState.isDeleted()) {
        newAspect.originalValuesMap = aspect.originalValues;
      }
      result.entityAspect = newAspect;
    } else {
      aspect = so.complexAspect;
      newAspect = {};
      if (aspect.originalValues && !__isEmpty(aspect.originalValues)) {
        newAspect.originalValuesMap = aspect.originalValues;
      }

      result.complexAspect = newAspect;
    }

    return result;
  }

  function exportTempKeyInfo(entityAspect, tempKeys) {
    var entity = entityAspect.entity;
    if (entityAspect.hasTempKey) {
      tempKeys.push(entityAspect.getKey().toJSON());
    }
    // create map for this entity with foreignKeys that are 'temporary'
    // map -> key: tempKey, value: fkPropName
    var tempNavPropNames;
    entity.entityType.navigationProperties.forEach(function (np) {
      if (np.relatedDataProperties) {
        var relatedValue = entity.getProperty(np.name);
        if (relatedValue && relatedValue.entityAspect.hasTempKey) {
          tempNavPropNames = tempNavPropNames || [];
          tempNavPropNames.push(np.name);
        }
      }
    });
    return tempNavPropNames;
  }

  function importEntityGroup(entityGroup, jsonGroup, config) {

    var tempKeyMap = config.tempKeyMap;

    var entityType = entityGroup.entityType;
    var mergeStrategy = config.mergeStrategy;

    var targetEntity = null;

    var em = entityGroup.entityManager;
    var entityChanged = em.entityChanged;
    var entitiesToLink = [];
    var rawValueFn = DataProperty.getRawValueFromClient;
    jsonGroup.entities.forEach(function (rawEntity) {
      var newAspect = rawEntity.entityAspect;

      var entityKey = entityType.getEntityKeyFromRawEntity(rawEntity, rawValueFn);
      var entityState = EntityState.fromName(newAspect.entityState);
      if (!entityState || entityState == EntityState.Detached ) {
        throw new Error("Only entities with a non detached entity state may be imported.");
      }

      // Merge if raw entity is in cache
      // UNLESS this is a new entity w/ a temp key
      // Cannot safely merge such entities even
      // if could match temp key to an entity in cache.
      var newTempKey = entityState.isAdded() && getMappedKey(tempKeyMap, entityKey);
      targetEntity = newTempKey ? null : entityGroup.findEntityByKey(entityKey);

      if (targetEntity) {
        if (mergeStrategy === MergeStrategy.SkipMerge) {
          // deliberate fall thru
        } else if (mergeStrategy === MergeStrategy.Disallowed) {
          throw new Error("A MergeStrategy of 'Disallowed' prevents " + entityKey.toString() + " from being merged");
        } else {
          var targetEntityState = targetEntity.entityAspect.entityState;
          var wasUnchanged = targetEntityState.isUnchanged();
          if (mergeStrategy === MergeStrategy.OverwriteChanges || wasUnchanged) {
            entityType._updateTargetFromRaw(targetEntity, rawEntity, rawValueFn);
            targetEntity.entityAspect.setEntityState(entityState);
            entityChanged.publish({ entityAction: EntityAction.MergeOnImport, entity: targetEntity });
          }
        }
      } else {
        targetEntity = entityType._createInstanceCore();
        entityType._updateTargetFromRaw(targetEntity, rawEntity, rawValueFn);
        if (newTempKey) {
          targetEntity.entityAspect.hasTempKey = true;
          // fixup pk
          targetEntity.setProperty(entityType.keyProperties[0].name, newTempKey.values[0]);

          // fixup foreign keys
          // This is safe because the entity is detached here and therefore originalValues will not be updated.
          if (newAspect.tempNavPropNames) {
            newAspect.tempNavPropNames.forEach(function (npName) {
              var np = entityType.getNavigationProperty(npName);
              var fkPropName = np.relatedDataProperties[0].name;
              var oldFkValue = targetEntity.getProperty(fkPropName);
              var fk = new EntityKey(np.entityType, [oldFkValue]);
              var newFk = getMappedKey(tempKeyMap, fk);
              targetEntity.setProperty(fkPropName, newFk.values[0]);
            });
          }
        }
        // Now performed in attachEntity
        targetEntity = entityGroup.attachEntity(targetEntity, entityState);
        entityChanged.publish({ entityAction: EntityAction.AttachOnImport, entity: targetEntity });
        if (!entityState.isUnchanged()) {
          em._notifyStateChange(targetEntity, true);
        }

      }

      entitiesToLink.push(targetEntity);
    });
    return entitiesToLink;
  }

  function getMappedKey(tempKeyMap, entityKey) {
    var newKey = tempKeyMap[entityKey.toString()];
    if (newKey) return newKey;
    var subtypes = entityKey._subtypes;
    if (!subtypes) return null;
    for (var i = 0, j = subtypes.length; i < j; i++) {
      newKey = tempKeyMap[entityKey.toString(subtypes[i])];
      if (newKey) return newKey;
    }
    return null;
  }

  function promiseWithCallbacks(promise, callback, errorCallback) {
    promise = promise.then(function (data) {
      if (callback) callback(data);
      return Q.resolve(data);
    }, function (error) {
      if (errorCallback) errorCallback(error);
      return Q.reject(error);
    });
    return promise;
  }

  function getEntitiesToSave(em, entities) {
    var entitiesToSave;
    if (entities) {
      entitiesToSave = entities.filter(function (e) {
        if (e.entityAspect.entityManager !== em) {
          throw new Error("Only entities in this entityManager may be saved");
        }
        return !e.entityAspect.entityState.isDetached();
      });
    } else {
      entitiesToSave = em.getChanges();
    }
    return entitiesToSave;
  }

  function fixupKeys(em, keyMappings) {
    em._inKeyFixup = true;
    keyMappings.forEach(function (km) {
      var group = em._entityGroupMap[km.entityTypeName];
      if (!group) {
        throw new Error("Unable to locate the following fully qualified EntityType name: " + km.entityTypeName);
      }
      group._fixupKey(km.tempValue, km.realValue);
    });
    em._inKeyFixup = false;
  }

  function getEntityGroups(em, entityTypes) {
    var groupMap = em._entityGroupMap;
    if (entityTypes) {
      return __toArray(entityTypes).map(function (et) {
        if (et instanceof EntityType) {
          return groupMap[et.name];
        } else {
          throw new Error("The EntityManager.getChanges() 'entityTypes' parameter must be either an entityType or an array of entityTypes or null");
        }
      });
    } else {
      return __getOwnPropertyValues(groupMap);
    }
  }

  function checkEntityKey(em, entity) {
    var ek = entity.entityAspect.getKey();
    // return properties that are = to defaultValues
    var keyPropsWithDefaultValues = __arrayZip(entity.entityType.keyProperties, ek.values, function (kp, kv) {
      return (kp.defaultValue === kv) ? kp : null;
    }).filter(function (kp) {
      return kp !== null;
    });
    if (keyPropsWithDefaultValues.length) {
      if (entity.entityType.autoGeneratedKeyType !== AutoGeneratedKeyType.None) {
        em.generateTempKeyValue(entity);
      } else {
        // we will allow attaches of entities where only part of the key is set.
        if (keyPropsWithDefaultValues.length === ek.values.length) {
          throw new Error("Cannot attach an object of type  (" + entity.entityType.name + ") to an EntityManager without first setting its key or setting its entityType 'AutoGeneratedKeyType' property to something other than 'None'");
        }
      }
    }
  }

  function validateEntityStates(em, entityStates) {
    if (!entityStates) return null;
    entityStates = __toArray(entityStates);
    entityStates.forEach(function (es) {
      if (!EntityState.contains(es)) {
        throw new Error("The EntityManager.getChanges() 'entityStates' parameter must either be null, an entityState or an array of entityStates");
      }
    });
    return entityStates;
  }

  proto._attachEntityCore = function (entity, entityState, mergeStrategy) {
    var group = findOrCreateEntityGroup(this, entity.entityType);
    var attachedEntity = group.attachEntity(entity, entityState, mergeStrategy);
    this._linkRelatedEntities(attachedEntity);
    return attachedEntity;
  }

  proto._updateFkVal = function (fkProp, oldValue, newValue) {
    var group = this._entityGroupMap[fkProp.parentType.name];
    if (!group) return;
    group._updateFkVal(fkProp, oldValue, newValue);
  }

  function attachRelatedEntities(em, entity, entityState, mergeStrategy) {
    var navProps = entity.entityType.navigationProperties;
    navProps.forEach(function (np) {
      var related = entity.getProperty(np.name);
      if (np.isScalar) {
        if (!related) return;
        em.attachEntity(related, entityState, mergeStrategy);
      } else {
        related.forEach(function (e) {
          em.attachEntity(e, entityState, mergeStrategy);
        });
      }
    });
  }

  // returns a promise
  function executeQueryCore(em, query, queryOptions, dataService) {
    try {
      var results;
      var metadataStore = em.metadataStore;

      if (metadataStore.isEmpty() && dataService.hasServerMetadata) {
        throw new Error("cannot execute _executeQueryCore until metadataStore is populated.");
      }

      if (queryOptions.fetchStrategy === FetchStrategy.FromLocalCache) {
        try {
          var qr = executeQueryLocallyCore(em, query);
          return Q.resolve({ results: qr.results, entityManager: em, inlineCount: qr.inlineCount, query: query });
        } catch (e) {
          return Q.reject(e);
        }
      }

      var mappingContext = new MappingContext({
        query: query,
        entityManager: em,
        dataService: dataService,
        mergeOptions: {
          mergeStrategy: queryOptions.mergeStrategy,
          noTracking: !!query.noTrackingEnabled,
          includeDeleted: queryOptions.includeDeleted
        }
      });

      var validateOnQuery = em.validationOptions.validateOnQuery;

      return dataService.adapterInstance.executeQuery(mappingContext).then(function (data) {
        var result = __wrapExecution(function () {
          var state = { isLoading: em.isLoading };
          em.isLoading = true;
          em._pendingPubs = [];
          return state;
        }, function (state) {
          // cleanup
          em.isLoading = state.isLoading;
          em._pendingPubs.forEach(function (fn) {
            fn();
          });
          em._pendingPubs = null;
          em._hasChangesAction && em._hasChangesAction();
          // HACK for GC
          query = null;
          mappingContext = null;
          // HACK: some errors thrown in next function do not propogate properly - this catches them.

          if (state.error) {
            Q.reject(state.error);
          }

        }, function () {
          var nodes = dataService.jsonResultsAdapter.extractResults(data);
          nodes = __toArray(nodes);

          results = mappingContext.visitAndMerge(nodes, { nodeType: "root" });
          if (validateOnQuery) {
            results.forEach(function (r) {
              // anon types and simple types will not have an entityAspect.
              r.entityAspect && r.entityAspect.validateEntity();
            });
          }
          mappingContext.processDeferred();
          // if query has expand clauses walk each of the 'results' and mark the expanded props as loaded.
          markLoadedNavProps(results, query);
          var retrievedEntities = __objectMap(mappingContext.refMap);
          return { results: results, query: query, entityManager: em, httpResponse: data.httpResponse, inlineCount: data.inlineCount, retrievedEntities: retrievedEntities };
        });
        return Q.resolve(result);
      }, function (e) {
        if (e) {
          e.query = query;
          e.entityManager = em;
        }
        return Q.reject(e);
      });

    } catch (e) {
      if (e) {
        e.query = query;
      }
      return Q.reject(e);
    }
  }

  function markLoadedNavProps(entities, query) {
    if (query.noTrackingEnabled) return;
    var expandClause = query.expandClause;
    if (expandClause == null) return;
    expandClause.propertyPaths.forEach(function (propertyPath) {
      var propNames = propertyPath.split('.');
      markLoadedNavPath(entities, propNames);
    });
  }

  function markLoadedNavPath(entities, propNames) {
    var propName = propNames[0];
    entities.forEach(function (entity) {
      var ea = entity.entityAspect;
      if (!ea) return; // entity may not be a 'real' entity in the case of a projection.
      ea._markAsLoaded(propName);
      if (propNames.length === 1) return;
      var next = entity.getProperty(propName);
      if (!next) return; // no children to process.
      // strange logic because nonscalar nav values are NOT really arrays
      // otherwise we could use Array.isArray
      if (!next.arrayChanged) next = [next];
      markLoadedNavPath(next, propNames.slice(1));
    });
  }

  function updateConcurrencyProperties(entities) {
    var candidates = entities.filter(function (e) {
      e.entityAspect.isBeingSaved = true;
      return e.entityAspect.entityState.isModified()
          && e.entityType.concurrencyProperties.length > 0;

    });
    if (candidates.length === 0) return;
    candidates.forEach(function (c) {
      c.entityType.concurrencyProperties.forEach(function (cp) {
        updateConcurrencyProperty(c, cp);
      });
    });
  }

  function updateConcurrencyProperty(entity, property) {
    // check if property has already been updated
    if (entity.entityAspect.originalValues[property.name]) return;
    var value = entity.getProperty(property.name);
    if (!value) value = property.dataType.defaultValue;
    if (property.dataType.isNumeric) {
      entity.setProperty(property.name, value + 1);
    } else if (property.dataType.isDate) {
      // use the current datetime but insure that it
      // is different from previous call.
      var dt = new Date();
      var dt2 = new Date();
      while (dt.getTime() === dt2.getTime()) {
        dt2 = new Date();
      }
      entity.setProperty(property.name, dt2);
    } else if (property.dataType === DataType.Guid) {
      entity.setProperty(property.name, __getUuid());
    } else if (property.dataType === DataType.Binary) {
      // best guess - that this is a timestamp column and is computed on the server during save
      // - so no need to set it here.
      return;
    } else {
      // this just leaves DataTypes of Boolean, String and Byte - none of which should be the
      // type for a concurrency column.
      // NOTE: thought about just returning here but would rather be safe for now.
      throw new Error("Unable to update the value of concurrency property before saving: " + property.name);
    }
  }


  function findOrCreateEntityGroup(em, entityType) {
    var group = em._entityGroupMap[entityType.name];
    if (!group) {
      group = new EntityGroup(em, entityType);
      em._entityGroupMap[entityType.name] = group;
    }
    return group;
  }

  function findOrCreateEntityGroups(em, entityType) {
    var entityTypes = entityType.getSelfAndSubtypes();
    return entityTypes.map(function (et) {
      return findOrCreateEntityGroup(em, et);
    });
  }


  proto.helper = {
    unwrapInstance: unwrapInstance,
    unwrapOriginalValues: unwrapOriginalValues,
    unwrapChangedValues: unwrapChangedValues
  };


  function unwrapInstance(structObj, transformFn) {

    var rawObject = {};
    var stype = structObj.entityType || structObj.complexType;
    var serializerFn = getSerializerFn(stype);
    var unmapped = {};
    stype.dataProperties.forEach(function (dp) {
      if (dp.isComplexProperty) {
        rawObject[dp.nameOnServer] = __map(structObj.getProperty(dp.name), function (co) {
          return unwrapInstance(co, transformFn);
        });
      } else {
        var val = structObj.getProperty(dp.name);
        val = transformFn ? transformFn(dp, val) : val;
        if (val === undefined) return;
        val = serializerFn ? serializerFn(dp, val) : val;
        if (val !== undefined) {
          if (dp.isUnmapped) {
            unmapped[dp.nameOnServer] = __toJSONSafe(val);
          } else {
            rawObject[dp.nameOnServer] = val;
          }
        }
      }
    });

    if (!__isEmpty(unmapped)) {
      rawObject.__unmapped = unmapped;
    }
    return rawObject;
  }

  function unwrapOriginalValues(target, metadataStore, transformFn) {
    var stype = target.entityType || target.complexType;
    var aspect = target.entityAspect || target.complexAspect;
    var fn = metadataStore.namingConvention.clientPropertyNameToServer;
    var result = {};
    __objectForEach(aspect.originalValues, function (propName, val) {
      var prop = stype.getProperty(propName);
      val = transformFn ? transformFn(prop, val) : val;
      if (val !== undefined) {
        result[fn(propName, prop)] = val;
      }
    });
    stype.complexProperties.forEach(function (cp) {
      var nextTarget = target.getProperty(cp.name);
      if (cp.isScalar) {
        var unwrappedCo = unwrapOriginalValues(nextTarget, metadataStore, transformFn);
        if (!__isEmpty(unwrappedCo)) {
          result[fn(cp.name, cp)] = unwrappedCo;
        }
      } else {
        var unwrappedCos = nextTarget.map(function (item) {
          return unwrapOriginalValues(item, metadataStore, transformFn);
        });
        result[fn(cp.name, cp)] = unwrappedCos;
      }
    });
    return result;
  }

  function unwrapChangedValues(entity, metadataStore, transformFn) {
    var stype = entity.entityType;
    var serializerFn = getSerializerFn(stype);
    var fn = metadataStore.namingConvention.clientPropertyNameToServer;
    var result = {};
    __objectForEach(entity.entityAspect.originalValues, function (propName, value) {
      var prop = stype.getProperty(propName);
      var val = entity.getProperty(propName);
      val = transformFn ? transformFn(prop, val) : val;
      if (val === undefined) return;
      val = serializerFn ? serializerFn(prop, val) : val;
      if (val !== undefined) {
        result[fn(propName, prop)] = val;
      }
    });
    // any change to any complex object or array of complex objects returns the ENTIRE
    // current complex object or complex object array.  This is by design. Complex Objects
    // are atomic.
    stype.complexProperties.forEach(function (cp) {
      if (cpHasOriginalValues(entity, cp)) {
        var coOrCos = entity.getProperty(cp.name);
        result[fn(cp.name, cp)] = __map(coOrCos, function (co) {
          return unwrapInstance(co, transformFn);
        });
      }
    });
    return result;
  }

  function cpHasOriginalValues(structuralObject, cp) {
    var coOrCos = structuralObject.getProperty(cp.name);
    if (cp.isScalar) {
      return coHasOriginalValues(coOrCos);
    } else {
      // this occurs when a nonscalar co array has had cos added or removed.
      if (coOrCos._origValues) return true;
      return coOrCos.some(function (co) {
        return coHasOriginalValues(co);
      });
    }
  }

  function coHasOriginalValues(co) {
    // next line checks all non complex properties of the co.
    if (!__isEmpty(co.complexAspect.originalValues)) return true;
    // now need to recursively check each of the cps
    return co.complexType.complexProperties.some(function (cp) {
      return cpHasOriginalValues(co, cp);
    });
  }

  function getSerializerFn(stype) {
    return stype.serializerFn || (stype.metadataStore && stype.metadataStore.serializerFn);
  }


  function UnattachedChildrenMap() {
    // key is EntityKey.toString(), value is array of { navigationProperty, children }
    this.map = {};
  }

  UnattachedChildrenMap.prototype.addChild = function (parentEntityKey, navigationProperty, child) {
    var tuple = this.getTuple(parentEntityKey, navigationProperty);
    if (!tuple) {
      tuple = { navigationProperty: navigationProperty, children: [] };
      __getArray(this.map, parentEntityKey.toString()).push(tuple);
    }
    tuple.children.push(child);
  };

  UnattachedChildrenMap.prototype.removeChildren = function (parentEntityKey, navigationProperty) {
    var tuples = this.getTuples(parentEntityKey);
    if (!tuples) return;
    __arrayRemoveItem(tuples, function (t) {
      return t.navigationProperty === navigationProperty;
    });
    if (!tuples.length) {
      delete this.map[parentEntityKey.toString()];
    }
  };

  UnattachedChildrenMap.prototype.getChildren = function (parentEntityKey, navigationProperty) {
    var tuple = this.getTuple(parentEntityKey, navigationProperty);
    if (tuple) {
      return tuple.children.filter(function (child) {
        // it may have later been detached.
        return !child.entityAspect.entityState.isDetached();
      });
    } else {
      return null;
    }
  };

  UnattachedChildrenMap.prototype.getTuple = function (parentEntityKey, navigationProperty) {
    var tuples = this.getTuples(parentEntityKey);
    if (!tuples) return null;
    var tuple = __arrayFirst(tuples, function (t) {
      return t.navigationProperty === navigationProperty;
    });
    return tuple;
  };


  UnattachedChildrenMap.prototype.getTuples = function (parentEntityKey) {
    var tuples = this.map[parentEntityKey.toString()];
    var entityType = parentEntityKey.entityType;
    while (!tuples && entityType.baseEntityType) {
      entityType = entityType.baseEntityType;
      var baseKey = parentEntityKey.toString(entityType);
      tuples = this.map[baseKey];
    }
    return tuples;
  };

  return ctor;
})();


// expose
breeze.EntityManager = EntityManager;

