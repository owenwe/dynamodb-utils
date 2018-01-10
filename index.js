/**
 * Constructs and returns a custom error object with an additional "type" property
 * @param error Error
 * @returns {{name: string, type: string, message: string}}
 */
const createError = (error) => {
  let errorName = error.hasOwnProperty('name') ? error.name : ''
  let errorMessage = error.hasOwnProperty('message') ? error.message : ''
  let errorType = 'Generic Error'

  if (error instanceof EvalError) {
    errorType = 'EvalError'
  } else if (error instanceof RangeError) {
    errorType = 'RangeError'
  } else if (error instanceof ReferenceError) {
    errorType = 'ReferenceError'
  } else if (error instanceof SyntaxError) {
    errorType = 'SyntaxError'
  } else if (error instanceof TypeError) {
    errorType = 'TypeError'
  } else if (error instanceof URIError) {
    errorType = 'URIError'
  }

  return {name: errorName, type: errorType, message: errorMessage}
}

/**
 * Creates a response object good for AWS Lambda return values from a proxy API gateway
 * @param code Number
 * @param body Anything that can be put into JSON.stringify()
 * @returns {{statusCode: *, body}}
 */
const createResponse = (code, body) => {
  return {
    statusCode: code,
    body: typeof body === 'string' ? body : JSON.stringify(body)
  }
}

/**
 * Constructs and returns a function using the provided callback.
 * @param apiCallback Function common callback from a Lambda function, using the provided function as the Lambda callback
 */
const apiCallHandler = (apiCallback) => (err, data) => {
  if (err) {
    console.error(err)
    apiCallback(null, createResponse(501, err))
  } else {
    apiCallback(null, createResponse(200, data))
  }
}

/**
 * Adds a new property with the name of the passed key parameter and a value of the passed value parameter.
 * @param object Object
 * @param key String
 * @param value *
 * @returns {Object}
 */
const addObjectProperty = (object, key, value) => {
  return Object.defineProperty(object, key, {value: value, enumerable: true, configurable: true, writable: true})
}

/**
 * Returns the size in bytes of the string
 * @param s String
 * @returns * Number or undefined if a string isn't provided
 */
const byteCount = (s) => {
  return typeof s === 'string'
    ? encodeURIComponent(s).replace(/%([0-9A-F]{2})/g, (match, g) => String.fromCharCode(Number.parseInt(`0x${g}`))).length
    : undefined
}

/**
 * Returns the size of the string in kilobytes
 * @param s String
 * @returns * Number or undefined if a string isn't provided
 */
const kilobyteCount = (s) => {
  return typeof s === 'string' ? toKilobyte(byteCount(s)) : undefined
}

/**
 * Converts a value in bytes to Kilobytes
 * @param n Number a value that represents the amount of bytes
 * @returns {*} Number or undefined if a number isn't provided
 */
const toKilobyte = (n) => {
  return typeof n === 'number' ? (n / 1024).toFixed(2) * 1 : undefined
}

const getObjectSize = (name, o) => {
  let objectType = typeof o
  let size = 0
  switch (objectType) {
    case 'string':
      size = stringSizeCount(name, o)
      break
    case 'number':
      if (isFinite(o)) {
        size = numberSizeCount(name, o)
      }
      break
    case 'boolean':
      size = nullBoolSizeCount(name, o)
      break
    case 'object':
      // array, object, null, or Class-based
      if (o instanceof Array) {
        size = arraySizeCount(name, o)
      } else if (o instanceof Object) {
        size = objectSizeCount(name, o)
      } else if (o instanceof String) {
        size = stringSizeCount(name, o)
      } else if (o instanceof Number) {
        size = numberSizeCount(name, o)
      } else if (o instanceof ArrayBuffer) {
        size = binarySizeCOunt(name, o)
      } else if (o instanceof Boolean) {
        size = nullBoolSizeCount(name, o.valueOf())
      } else if (o === null) {
        size = nullBoolSizeCount(name, o)
      }
      break
  }
  return size
}

/**
 * Calculates the size (in KB) of the passed item and returns the size as AWS would determine it
 * For example, if BatchWriteItem writes a 500 byte item and a 3.5 KB item, DynamoDB will calculate the size
 * as 5 KB (1 KB + 4 KB), not 4 KB (500 bytes + 3.5 KB)
 *
 * @param item Object
 */
const itemSizeCount = (item) => {
  if (item instanceof Object) {
    let keys = Object.keys(item)
    if (keys.length > 0) {
      let size = 0
      keys.map((k) => {
        size += getObjectSize(k, item[k])
      })
      return Math.ceil(toKilobyte(size))
    }
  }
  return undefined
}

/**
 * Sums up the size of the passed object and returns the total
 * @param name String
 * @param o Object
 * @returns {*} Number
 */
const objectSizeCount = (name, o) => {
  let size = name.length + 3
  let keys = Object.keys(o)
  keys.map((k) => {
    size += (3 + getObjectSize(k, o[k]))
  })
  return size
}

/**
 * Sums up the size of the passed array and returns the total
 * @param name String
 * @param a Array
 * @returns {*} Number
 */
const arraySizeCount = (name, a) => {
  let size = name.length + 3
  a.map((e) => {
    size += (3 + getObjectSize(e))
  })
  return size
}

/**
 * Returns the size of a string item (for AWS capactity unit consumption)
 * @param name String
 * @param s String
 * @returns {*} Number
 */
const stringSizeCount = (name, s) => {
  return name.length + byteCount(s)
}

/**
 * Returns the size of a number item (for AWS capactity unit consumption)
 * @param name
 * @param n
 * @returns {*}
 */
const numberSizeCount = (name, n) => {
  let size = name.length + 1
  if (n.toString().includes('.')) {
    let fpart = n.toString().split('.')[1]
    let fpartLength = fpart.length
    let i = 0
    for (i; i <= fpartLength; i += 2) {
      size += 2
    }
  }
  return size
}

/**
 * Returns the size of a binary/byte array item (for AWS capactity unit consumption)
 * @param name String
 * @param b byte array
 * @returns {*} Number
 */
const binarySizeCOunt = (name, b) => {
  return name.length + b.length
}

/**
 * Returns the size of a boolean or null item (for AWS capactity unit consumption)
 * @param name String
 * @param nb Null or Boolean
 * @returns {*} Number
 */
const nullBoolSizeCount = (name, nb) => {
  return (nb === null || typeof nb === 'boolean') ? name.length + 1 : 0
}

/**
 * Encodes a string into a base 64 byte array value
 * @param s String
 * @returns {*} byte array string or undefined
 */
const base64Encode = (s) => {
  return typeof s === 'string'
    ? this.btoa(encodeURIComponent(s).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(Number.parseInt(`0x${p1}`))
    }))
    : undefined
}

/**
 * Decodes a base 64 encoded byte array back to a string
 * @param s String in Base64 format
 * @returns {*} String or undefined
 */
const base64Decode = (s) => {
  return typeof s === 'string'
    ? decodeURIComponent(this.atob(s).split('').map((c) => '%' + `00${c.charCodeAt(0).toString(16)}`.slice(-2)).join(''))
    : undefined
}

/**
 * Constructs and returns an AWS DynamoDB Set that can be used for API calls.
 * @param type String
 * @param setContent Array
 * @returns {Object}
 */
const createSet = (type, setContent) => {
  return Object.defineProperty({}, type, {
    configurable: true,
    enumerable: true,
    writable: true,
    value: setContent
  })
}

/**
 * Constructs and returns an AWS DynamoDB attribute object that can be used for API calls.
 * @param o Object
 * @returns {*} Object or Null attribute object
 */
const createAttribute = (o) => {
  let newProperty = {}
  switch (typeof o) {
    case 'string':
      if (o.trim().length > 0) {
        addObjectProperty(newProperty, 'S', o.trim())
      }
      break
    case 'number':
      if (isFinite(o)) {
        addObjectProperty(newProperty, 'N', o.toString())
      }
      break
    case 'boolean':
      addObjectProperty(newProperty, 'BOOL', o)
      break
    case 'object':
      // array, object, null, or Class-based
      if (o instanceof Array) {
        let newPropertyValue = []
        o.map((i) => {
          newPropertyValue.push(createAttribute(i))
        })
        addObjectProperty(newProperty, 'L', newPropertyValue)
      } else if (o instanceof Object) {
        Object.assign(newProperty, object2Map(o))
      } else if (o instanceof String) {
        if (o.trim().length > 0) {
          addObjectProperty(newProperty, 'S', o)
        }
      } else if (o instanceof Number) {
        if (isFinite(o)) {
          addObjectProperty(newProperty, 'N', o.toString())
        }
      } else if (o instanceof ArrayBuffer) {

      } else if (o instanceof Boolean) {
        addObjectProperty(newProperty, 'BOOL', o)
      } else if (o === null) {
        addObjectProperty(newProperty, 'NULL', true)
      }
      break
  }
  return Object.keys(newProperty).length > 0 ? newProperty : createAttribute(null)
}

/**
 * Constructs and returns an AWS DynamoDB map object that can be used for API calls.
 * @param o Object
 * @returns {Object} or Null attribute object
 */
const object2Map = (o) => {
  if (typeof o === 'object') {
    let mapValue = {}
    Object.keys(o).map((k) => {
      let property = o[k]
      let newProperty = createAttribute(property)
      if (newProperty) {
        Object.defineProperty(mapValue, k, {
          configurable: true,
          enumerable: true,
          writable: true,
          value: newProperty
        })
      }
    })
    if (Object.keys(mapValue).length > 0) {
      return {'M': mapValue}
    }
  }
  return createAttribute(null)
}

/**
 * Returns either the object passed if it's something or null
 * @param o {*}
 * @returns {*} or null
 */
const objectOrNull = (o) => {
  return !o ? null : o
}

/**
 * Returns either the object passed if it's not null, or an attribute equaling the NULL item attribute value
 * @param o {*}
 * @returns {*} or a NULL attribute object
 */
const attributeOrNull = (a) => {
  return !a ? createAttribute(null) : a
}

/**
 * Returns a boolean value that is true if the parameter passed is a property-based object
 * @param o {*}
 * @returns {boolean}
 */
const isObject = (o) => {
  return (typeof o === 'object' && o instanceof Object)
}

/**
 * Returns a boolean value that is true if the parameter passed is an array object
 * @param a {*}
 * @returns {boolean}
 */
const isArray = (a) => {
  return (typeof a === 'object' && a instanceof Array)
}

/**
 * Returns an object with property names that match the top-level property names of the passed object, but where
 * each value is an array of sub-level property names.
 * Example:
 *     given:
 *     {
 *       property1: 'value1',
 *       property2: [1,2,3],
 *       property3: {
 *         property3_1: 'v3.1',
 *         property3_2: {
 *           property3_2_1: {
 *             pickle: 'rick',
 *             morty: {
 *               versions: [
 *                 {universe: '31c-12', hasVirginity: true},
 *                 {universe: '31c-13', hasVirginity: true},
 *                 {universe: '31c-14', hasVirginity: true},
 *                 {universe: '31d-10', hasVirginity: true},
 *                 {universe: '31d-43', hasVirginity: true},
 *                 {universe: '38q-27', hasVirginity: false},
 *                 {universe: '47z-02', hasVirginity: true}
 *               ]
 *             }
 *           }
 *         },
 *         property3_3: 101
 *       },
 *       property4: {
 *         property4_1: 'baz'
 *       }
 *     }
 *
 *     returns:
 *     {
 *       property1: [],
 *       property2: [
 *         {'0': []},
 *         {'1': []},
 *         {'2': []},
 *       ],
 *       property3: [
 *           {'property3_1': []},
 *           {
 *             'property3_2': [
 *               {
 *                 'property3_2_1': [
 *                   {'pickle': []},
 *                   {
 *                     'morty': [
 *                       {
 *                         versions: [
 *                           {
 *                             universe: [],
 *                             hasVirginity: []
 *                           }
 *                         ]
 *                       }
 *                     ]
 *                   }
 *                 ]
 *               }
 *             ],
 *             'property3_3': []
 *           }
 *       ],
 *       property4: [
 *           'property4_1': []
 *       ]
 *     }
 * @param o Object
 * @returns {{}}
 */
const getPropertyPaths = (o) => {
  let pathsObject = {}
  Object.entries(o).map((prop) => {
    let pathsArray = []
    let pKey = prop[0]
    let pValue = prop[1]
    if (isArray(pValue)) {
      pValue.map((p, i) => {
        let subValue = p
        if (isObject(p[1])) {
          subValue = getPropertyPaths(addObjectProperty({}, i.toString(), p))
        }
        pathsArray.push(getPropertyPaths(addObjectProperty({}, i.toString(), subValue)))
      })
    } else if (isObject(pValue)) {
      Object.entries(pValue).map((p) => pathsArray.push(getPropertyPaths(addObjectProperty({}, p[0], p[1]))))
    }
    addObjectProperty(pathsObject, pKey, pathsArray)
  })
  return pathsObject
}

/**
 * Uses the passed property paths object and the array of strings to return a delimited string of valid
 * child-descending property names.
 * @param paths Object A paths object generated from the getPropertyPaths function
 * @param propertyNames Array
 * @param delimiter String defaults to "."
 * @returns String or undefined
 */
const toStringPath = (paths, propertyNames, delimiter = '.') => {
  let pathCheck = isObject(paths)
  let arrayCheck = pathCheck && isArray(propertyNames)
  let allStringsCheck = arrayCheck && propertyNames.every((e) => typeof e === 'string')
  let legitFirstCheck = allStringsCheck && paths.hasOwnProperty(propertyNames[0])
  if (legitFirstCheck) {
    let p = paths[propertyNames[0]]
    propertyNames.reduce((previousProperty, currentProperty) => {
      if (p !== null) {
        let nextPathObject = p.find((e) => e.hasOwnProperty(currentProperty))
        let shouldAssignNextProperty = nextPathObject &&
        nextPathObject[currentProperty] instanceof Array
          ? nextPathObject[currentProperty].length > 0
          : nextPathObject.hasOwnProperty(currentProperty)
        p = shouldAssignNextProperty ? nextPathObject[currentProperty] : null
      }
      return currentProperty
    })
    if (p !== null) {
      return propertyNames.join(delimiter)
    }
  }
}

/**
 * Uses the passed property paths object and delimited string of property names to return a valid array of
 * child-descenting property names.
 * @param paths Object A paths object generated from the getPropertyPaths function
 * @param propertyString String A string of delimited sequential property names
 * @param delimiter String default "."
 * @returns Array or undefined
 */
const toArrayPath = (paths, propertyString, delimiter = '.') => {
  let pathsCheck = isObject(paths)
  let propertyPathCheck = pathsCheck && typeof propertyString === 'string'
  let properties = propertyString.split(delimiter)
  let legitFirstCheck = propertyPathCheck && paths.hasOwnProperty(properties[0])
  if (legitFirstCheck) {
    let p = paths[properties[0]]
    properties.reduce((previousProperty, currentProperty) => {
      if (p !== null) {
        let nextPathObject = p.find((e) => e.hasOwnProperty(currentProperty))
        p = nextPathObject && nextPathObject.hasOwnProperty(currentProperty) ? nextPathObject[currentProperty] : null
      }
      return currentProperty
    })
    if (p !== null) {
      return properties
    }
  }
}

/**
 * Checks if the passed object has a property at the given path
 * @param item Object A regular property-based object
 * @param pathChain Array|String array of property names in child-descending order
 * @param delimiter String delimiting character for the split function, defaults to "."
 * @returns {boolean}
 */
const hasPropertyAtPath = (item, pathChain, delimiter = '.') => {
  let path = pathChain instanceof Array
    ? pathChain
    : (typeof pathChain === 'string' && typeof delimiter === 'string') ? pathChain.split(delimiter) : false

  if (!path) {
    console.warn('improper arguments supplied to hasPropertyAtPath')
    return false
  }

  if (path.length === 1) {
    return item.hasOwnProperty(path[0])
  }

  let propertyFound = false
  path.map((p, i) => {
    if (item.hasOwnProperty(p)) {
      propertyFound = hasPropertyAtPath(item[p], path.slice(i + 1))
    }
  })
  return propertyFound
}

/**
 * Checks if the passed item has an attribute at the given path
 * @param item Object an AWS item object
 * @param path Array array of property names in child-descending order
 *                   Examples:
 *                       "path.to.a.sub.object"
 *                       ["path","to","a","sub","object"]
 *                       "person.employees.5.firstName"
 * @param delimiter String delimiting character for the split function, defaults to "."
 * @returns {boolean}
 */
const hasAttributeAtPath = (item, path, delimiter = '.') => {
  return getAttributeAtPath(item, path, delimiter) !== false
}

/**
 * Returns the attribute in the passed AWS item at the given path.
 * @param item Object an AWS item object
 * @param path Array array of property names in child-descending order
 *                   Examples:
 *                       "path.to.a.sub.object"
 *                       ["path","to","a","sub","object"]
 *                       "person.employees.5.firstName"
 * @param delimiter String delimiting character for the split function, defaults to "."
 * @returns {*} An attribute or false if not found
 */
const getAttributeAtPath = (item, path, delimiter = '.', options = {}) => {
  let localPath = path instanceof Array
    ? (path.every((e) => typeof e === 'string')) ? path.slice() : false
    : (typeof path === 'string' && typeof delimiter === 'string') ? path.split(delimiter) : false
  let objectCheck = isObject(item)
  let pathCheck = (objectCheck && localPath !== false)
  let legitFirstCheck = item.hasOwnProperty(localPath[0])
  if (!pathCheck || !objectCheck || !legitFirstCheck) {
    console.warn('improper arguments supplied to getAttributePath')
    console.warn(`pathCheck: ${pathCheck}, objectCheck: ${objectCheck}, legitFirstCheck: ${legitFirstCheck}`)
    return false
  }

  let attributeFound = item
  let returnAttribute = item
  localPath.map((current, i) => {
    if (attributeFound.hasOwnProperty(current)) {
      let currentAttribute = attributeFound[current]
      returnAttribute = currentAttribute
      let attributeKeys = Object.keys(currentAttribute)
      if (attributeKeys.length > 0 && attributeKeys.length < 2) {
        let attributeKeyCode = attributeKeys[0]
        switch (attributeKeyCode) {
          case 'S':
          case 'N':
          case 'B':
          case 'NULL':
          case 'BOOL':
            attributeFound = attributeFound[current]
            break
          case 'M':
            attributeFound = attributeFound[current][attributeKeyCode]
            break
          case 'L':
          case 'SS':
          case 'NS':
          case 'BS':
            let nextPath = localPath.slice(i + 1)
            let indexValue = localPath[i + 1]
            if (nextPath.length > 1) {
              if (isFinite(indexValue) && indexValue < attributeFound[current][attributeKeyCode].length) {
                attributeFound = currentAttribute[attributeKeyCode]
              }
            } else if (nextPath.length <= 1) {
              attributeFound = currentAttribute[attributeKeyCode]
            }
            break
        }
      }
    } else if ((i + 1) === localPath.length) {
      returnAttribute = false
    }
  })
  return returnAttribute
}

/**
 * A function that will call batchWrite() on a section of the provided data, until all the data has been written.
 * @param client AWS.DynamoDB.DocumentClient
 * @param table String
 * @param requestItems [Object]
 * @param startIndex Number
 * @param step Number
 * @param callback Function
 */
const insertMultiObject = (client, table, requestItems, startIndex, step, callback) => {
  let endIndex = (startIndex + step) >= requestItems.length ? requestItems.length : startIndex + step
  let payload = Object.defineProperty({}, table, {
    value: requestItems.slice(startIndex, endIndex).map((p) => {
      // Adds a version property
      if (!p.hasOwnProperty('version')) {
        p['version'] = 1
      }
      // ASSERTION: each object in the bulk data array of exo planets has a "name" property,
      //            which will be the primary key (id)
      p['id'] = p.name
      return {PutRequest: {Item: p}}
    }),
    writable: true,
    configurable: true,
    enumerable: true
  })
  let params = {
    ReturnConsumedCapacity: 'INDEXES',
    ReturnItemCollectionMetrics: 'SIZE',
    RequestItems: payload
  }
  client.batchWrite(params, (err, response) => {
    if (err) {
      console.error(`ERROR ${JSON.stringify(err)}`)
      callback(null, createResponse(501, err))
    } else {
      if (endIndex === requestItems.length) {
        callback(null, createResponse(200, response))
      } else {
        insertMultiObject(client, table, requestItems, endIndex, step, callback)
      }
    }
  })
}

/**
 * A function that will kick off another function only after a DynamoDB table has the "ACTIVE" status.
 * @param db AWS.DynamoDB
 * @param client AWS.DynamoDB.DocumentClient
 * @param tableName String
 * @param waitingProperty String
 * @param tableData {*}
 * @param callback Function
 */
const waitForTable = (db, client, tableName, waitingProperty, tableData, callback) => {
  db.waitFor(waitingProperty, {TableName: tableName}, (err, data) => {
    if (err) {
      console.error(`Error waiting for ${waitingProperty} failed on table ${tableName}`)
    } else {
      console.log(`Table ${tableName} is ready to be populated`)
      callback(client, tableName, tableData, data)
    }
  })
}

exports.createError = createError
exports.createResponse = createResponse
exports.apiCallHandler = apiCallHandler
exports.addObjectProperty = addObjectProperty
exports.byteCount = byteCount
exports.kilobyteCount = kilobyteCount
exports.itemSizeCount = itemSizeCount
exports.arraySizeCount = arraySizeCount
exports.base64Encode = base64Encode
exports.base64Decode = base64Decode
exports.createSet = createSet
exports.createAttribute = createAttribute
exports.object2Map = object2Map
exports.objectOrNull = objectOrNull
exports.attributeOrNull = attributeOrNull
exports.getPropertyPaths = getPropertyPaths
exports.toStringPath = toStringPath
exports.toArrayPath = toArrayPath
exports.hasPropertyAtPath = hasPropertyAtPath
exports.hasAttributeAtPath = hasAttributeAtPath
exports.getAttributeAtPath = getAttributeAtPath
exports.insertMultiObject = insertMultiObject
exports.waitForTable = waitForTable
