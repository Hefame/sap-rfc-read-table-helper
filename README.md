# sap-rfc-read-table-helper
Función de ayuda para realizar llamadas a la RFC_READ_TABLE usando la librería [node-rfc](https://github.com/sap/node-rfc).

## Requisitos
Este paquete provee de funciones que ayudan a realizar la llamada a la RFC remota RFC_READ_TABLE, pero necesita de un cliente [node-rfc](https://github.com/sap/node-rfc) configurado y en ejecución.

## Instalación

La funcionalidad se instala como un paquete NPM estándard.

```
npm install @hefame/rfc-read-table --save
```

## Uso

El uso básico de la función, es tal que así.

```javascript
const noderfc = require("node-rfc");
const rfcReadTable = require("@hefame/rfc-read-table");

const client = new noderfc.Client({ dest: "T01" });

(async () => {
  try {
    await client.open();
    const result = await rfcReadTable(client, {
      table: 'LIKP',
      fields: ['VBELN', 'ERDAT', 'ERZET'],
      where: 'VBELN LIKE "3% AND ERDAT GE "11072022" OR VBELN LIKE "4% AND ERDAT GE "10032021"',
      skip: 10, // Campo opcional, por defecto 0
      limit: 50 // Campo opcional, por defecto 0 (sin límite)
    })

    console.log(result);
  } catch (err) {
    console.error(err);
  }
})();
```

```javascript
[
  { VBELN: '3048852103', ERDAT: '20200605', ERZET: '153355' },
  { VBELN: '3070939253', ERDAT: '20211214', ERZET: '205600' },
  { VBELN: '0381675312', ERDAT: '20150417', ERZET: '164218' }
]
```

### Mapeo del nombre de los campos
Opcionalmente, podemos indicar un array de nombres de campos `fieldNameMap` , de modo que a la salida de la función, los resultados de los campos de salida se mapeen con los nombres que le indiquemos.

> Nótese que el mapeo de los nombres de los campos se hace en el mismo orden de aparición. Si un campo no tiene un nombre al que ser mapeado, se respeta el nombre original del campo, como se puede ver en el siguiente ejemplo:


```javascript
const noderfc = require("node-rfc");
const rfcReadTable = require("@hefame/rfc-read-table");

const client = new noderfc.Client({ dest: "T01" });

(async () => {
  try {
    await client.open();
    const result = await rfcReadTable(client, {
      table: 'LIKP',
      fields: ['VBELN', 'ERDAT', 'ERZET', 'BZIRK'],
      where: 'VBELN LIKE "3% AND ERDAT GE "11072022" OR VBELN LIKE "4% AND ERDAT GE "10032021"',
      skip: 0,
      limit: 10,
      fieldNameMap: ['invoice', null, 'time']
    })

    console.log(result);
  } catch (err) {
    console.error(err);
  }
})();
```

A la salida, los campos obtenidos de leer la tabla, cuyos nombres son `['VBELN', 'ERDAT', 'ERZET', 'BZIRK']` son mapeados según el array `['invoice', null, 'time']`, luego:

1. `VBELN` pasa a llamarse `invoice`.
2. `ERDAT` se mantiene con el mismo nombre, ya que en la lista de nombres, la posicion `[1]` es `null`.
3. `ERZET` pasa a llamarse `time`.
4. `BZIRK` se mantiene con el mismo nombre, ya que en la lista de nombres, la posicion `[3]` no existe.


```javascript
[
  { invoice: '3048852103', ERDAT: '20200605', time: '153355', BZIRK: 'A09' },
  { invoice: '3070939253', ERDAT: '20211214', time: '205600', BZIRK: 'A20' },
  { invoice: '0381675312', ERDAT: '20150417', time: '164218', BZIRK: 'A01' }
]
```


### Funcion de mapeo de filas

Es posible ejecutar una función de mapeo para cada línea devuelta por la lectura de la tabla. Esta función se especifica con el parámetro `rowMapFn`, que recibe una función que es llamada con la línea tratada, antes de ser devuelta, y debe devolver el nuevo valor para la línea (¡Es posible mutar y devolver el mismo objeto de linea!).

> Nótese que si se llama a `rfcReadTable` con la opción `fieldNameMap`, el objeto con los valores de la línea aparece con los nombres ya cambiados por los indicados.



```javascript
const noderfc = require("node-rfc");
const rfcReadTable = require("@hefame/rfc-read-table");

const client = new noderfc.Client({ dest: "T01" });

(async () => {
  try {
    await client.open();
    const result = await rfcReadTable(client, {
      table: 'LIKP',
      fields: ['VBELN', 'ERDAT', 'ERZET'],
      where: 'VBELN LIKE "3% AND ERDAT GE "11072022" OR VBELN LIKE "4% AND ERDAT GE "10032021"',
      skip: 0,
      limit: 10,
      fieldNameMap: ['invoice', 'date', 'time'],
      rowMapFn: (row) => {
        // ¡ Podemos mutar la línea para ahorrar memoria !
        row.jsDate = rfcReadTable.dateTimeUnion(row.ERDAT, row.time) ;
        delete row.ERDAT;
        delete row.time;
        return row;
      }
    })

    console.log(result);
  } catch (err) {
    console.error(err);
  }
})();
```

```javascript
[
  { invoice: '3081996483', jsDate: Date('2022-09-18T10:00:44.000Z') },
  { invoice: '3081997221', jsDate: Date('2022-09-18T10:00:45.000Z') },
  { invoice: '3081996495', jsDate: Date('2022-09-18T10:00:55.000Z') },
  { invoice: '3081997223', jsDate: Date('2022-09-18T10:01:04.000Z') },
  { invoice: '3082001624', jsDate: Date('2022-09-18T11:18:15.000Z') },
  { invoice: '3082001630', jsDate: Date('2022-09-18T11:18:18.000Z') }
]
```

## Funciones adicionales de ayuda

### Unión de Date-Time
Es común recibir datos de Fecha/Hora de tablas SAP en forma de dos campos independientes de tipos `DATS` y `TIMS` respectivamente. Para unir estos dos valores en un objeto `Date` nativo, se puede utilizar la funcion `rfcReadTable.dateTimeUnion(dats, tims)`.

```javascript
let dats = '20221027'; 
let tims = '210728'; 
let dateObject = rfcReadTable.dateTimeUnion(dats, tims); 
// -> Date('2022-10-27T21:08:28.000Z')
```
> Nota: Queda pendiente ver como puede tratarse la zona horaria, ya que el resultado del objeto Date va en hora ZULÚ, ya que SAP no tiene el concepto de timezone (la maravillosa cagada de ralentizar el tiempo en los cambios de hora estacionales).

### Obtención de QUERY en crudo
Es posible que queramos simplemente obtener la query de la consulta a la tabla, sin llegar a ejecutar la consulta.
Para esto, es posible enviar en campo `sapClient` a `null`, y la función resolverá de manera inmediata la consulta.

```javascript
(async () => {
  const query = await rfcReadTable(null, { // Importante: sapClient -> null
    table: 'LIKP',
    fields: ['VBELN', 'ERDAT', 'ERZET'],
    where: 'VBELN LIKE "3% AND ERDAT GE "11072022" OR VBELN LIKE "4% AND ERDAT GE "10032021"',
    skip: 0,
    limit: 10
  })
  console.log(query);
})();
```

```javascript
{
  {
    QUERY_TABLE: 'LIKP',
    ROWSKIPS: 10,
    ROWCOUNT: 50,
    OPTIONS: [
      'VBELN LIKE "3%" AND ERDAT GE "11072022" OR VBELN LIKE "4%" AND ERDAT GE ',
      '"12072022"'
    ],
    FIELDS: [
      { FIELDNAME: 'VBELN' },
      { FIELDNAME: 'ERDAT' },
      { FIELDNAME: 'ERZET' }
    ]
  }
}
```
```
