

const rfcReadTable = async (sapClient, { table, fields, where, skip = 0, limit = 0, fieldNameMap = null, rowMapFn = null }) => {

    const query = {
        QUERY_TABLE: table,
        ROWSKIPS: skip,
        ROWCOUNT: limit,
		OPTIONS: where?.length ? where.split(/(.{72})/).filter(o => o) : [],
        FIELDS: Array.isArray(fields) ? fields.map(fieldName => {
            return { FIELDNAME: fieldName }
        }) : []
    }

	if (!sapClient) return query;

    const rfcResult = await sapClient.call("RFC_READ_TABLE", query)

    const fieldFnList = rfcResult.FIELDS.map((fieldDescription, idx) => {

        let startIdx = parseInt(fieldDescription.OFFSET, 10);
        let endIdx = startIdx + parseInt(fieldDescription.LENGTH, 10);
        let fieldName = fieldNameMap?.[idx] ? fieldNameMap[idx] : fieldDescription.FIELDNAME;

        switch (fieldDescription.TYPE) {
            case 'N': return (tableLine, resultObj) => {
                resultObj[fieldName] = parseInt(tableLine.substring(startIdx, endIdx), 10);
            }

            case 'P': return (tableLine, resultObj) => {
                resultObj[fieldName] = parseFloat(tableLine.substring(startIdx, endIdx));
            }

            default: return (tableLine, resultObj) => {
                resultObj[fieldName] = tableLine.substring(startIdx, endIdx);
            }
        }

    });

    if (rowMapFn) {
        return rfcResult.DATA.map(line => {
            const r = {};
            fieldFnList.forEach(fieldFn => {
                fieldFn(line.WA, r)
                
            })
            return rowMapFn(r);
        })
    }

    return rfcResult.DATA.map(line => {
        const r = {};
        fieldFnList.forEach(fieldFn => {
            fieldFn(line.WA, r)
        })
        return r;
    })

}

rfcReadTable.dateTimeUnion = (dats, tims) => {

    return new Date(
        parseInt(dats.substring(0,4)),
        parseInt(dats.substring(4,6)),
        parseInt(dats.substring(6,8)),
        parseInt(tims.substring(0,2)),
        parseInt(tims.substring(2,4)),
        parseInt(tims.substring(4,6)),
    )

}



module.exports = rfcReadTable;