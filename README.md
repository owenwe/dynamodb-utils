# dynamodb-utils
## DynamoDB Javascript Utilities
Small group of functions for interacting with the DynamoDB Javascript API.

* createError
* createResponse
* apiCallHandler
* addObjectProperty
* byteCount
* kilobyteCount
* toKilobyte
* getObjectSize
* itemSizeCount
* objectSizeCount
* arraySizeCount
* stringSizeCount
* numberSizeCount
* binarySizeCOunt
* nullBoolSizeCount
* base64Encode
* base64Decode
* createSet
* createAttribute
* object2Map
* objectOrNull
* attributeOrNull
* isObject
* isArray
* getPropertyPaths
* toStringPath
* toArrayPath
* hasPropertyAtPath
* hasAttributeAtPath
* getAttributeAtPath
* insertMultiObject
* waitForTable

### createError
Constructs and returns a custom error object with an additional "type" property

### createResponse
Creates a response object good for AWS Lambda return values from a proxy API gateway

### apiCallHandler
Constructs and returns a function using the provided callback.

### addObjectProperty
Adds a new property with the name of the passed key parameter and a value of the passed value parameter.

### byteCount
Returns the size in bytes of the string

### kilobyteCount
Returns the size of the string in kilobytes

### toKilobyte
Converts a value in bytes to Kilobytes

### getObjectSize
Returns the size of a generic object.

### itemSizeCount
Calculates the size (in KB) of the passed item and returns the size as AWS would determine it
For example, if BatchWriteItem writes a 500 byte item and a 3.5 KB item, DynamoDB will calculate the size
as 5 KB (1 KB + 4 KB), not 4 KB (500 bytes + 3.5 KB)

### objectSizeCount
Sums up the size of the passed object and returns the total

### arraySizeCount
Sums up the size of the passed array and returns the total

### stringSizeCount
Returns the size of a string item (for AWS capactity unit consumption)

### numberSizeCount
Returns the size of a number item (for AWS capactity unit consumption)

### binarySizeCOunt
Returns the size of a binary/byte array item (for AWS capactity unit consumption)

### nullBoolSizeCount
Returns the size of a boolean or null item (for AWS capactity unit consumption)

### base64Encode
Encodes a string into a base 64 byte array value

### base64Decode
Decodes a base 64 encoded byte array back to a string

### createSet
Constructs and returns an AWS DynamoDB Set that can be used for API calls.

### createAttribute
Constructs and returns an AWS DynamoDB attribute object that can be used for API calls.

### object2Map
Constructs and returns an AWS DynamoDB map object that can be used for API calls.

### objectOrNull
Returns either the object passed if it's something or null

### attributeOrNull
Returns either the object passed if it's not null, or an attribute equaling the NULL item attribute value

### isObject
Returns a boolean value that is true if the parameter passed is a property-based object

### isArray
Returns a boolean value that is true if the parameter passed is an array object

### getPropertyPaths
Returns an object with property names that match the top-level property names of the passed object, but where
each value is an array of sub-level property names.

Example

```javascript
// given
{
    property1: 'value1',
    property2: [1,2,3],
    property3: {
        property3_1: 'v3.1',
        property3_2: {
            property3_2_1: {
                pickle: 'rick',
                morty: {
                    versions: [
                        {universe: '31c-12', hasVirginity: true},
                        {universe: '31c-13', hasVirginity: true},
                        {universe: '31c-14', hasVirginity: true},
                        {universe: '31d-10', hasVirginity: true},
                        {universe: '31d-43', hasVirginity: true},
                        {universe: '38q-27', hasVirginity: false},
                        {universe: '47z-02', hasVirginity: true}
                    ]
                }
            }
        },
        property3_3: 101
    },
    property4: {
        property4_1: 'baz'
    }
}

// returns
{
    property1: [],
    property2: [
        {'0': []},
        {'1': []},
        {'2': []}
    ],
    property3: [
        {'property3_1': []},
        {
            'property3_2': [
                {
                    'property3_2_1': [
                        {'pickle': []},
                        {
                            'morty': [
                                {
                                    versions: [
                                        {
                                            universe: [],
                                            hasVirginity: []
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        {'property3_3': []}
    ],
    property4: [
        {'property4_1': []}
    ]
}
```

### toStringPath
Uses the passed property paths object and the array of strings to return a delimited string of valid
child-descending property names.

### toArrayPath
Uses the passed property paths object and delimited string of property names to return a valid array of
child-descenting property names.

### hasPropertyAtPath
Checks if the passed object has a property at the given path

### hasAttributeAtPath
Checks if the passed item has an attribute at the given path

### getAttributeAtPath
Returns the attribute in the passed AWS item at the given path.

### insertMultiObject
A function that will call batchWrite() on a section of the provided data, until all the data has been written.

### waitForTable
A function that will kick off another function only after a DynamoDB table has the "ACTIVE" status.
