export default {
    "development": {
        "gate": [ 
            { "id": "gate", "host": "127.0.0.1", "port": 3021, "frontend": true, "clientPort": 3001, },
        ],
        "connector": [
            { "id": "connector-server-1", "host": "127.0.0.1", "port": 4021, "frontend": true, "clientPort": 4001, },
        ],
        "katagoAnalysis" : [
            { "id": "katagoAnalysis-server-1", "host": "127.0.0.1", "port": 6021 },
        ],
        "katagoGTP" : [
            { "id": "katagoGTP-server-1", "host": "127.0.0.1", "port": 7021 },
        ]
    },
    "production": {
        "gate": [
            { "id": "gate", "host": "127.0.0.1", "port": 3021, "frontend": true, "clientPort": 3001, },
        ],
        "connector": [
            { "id": "connector-server-1", "host": "127.0.0.1", "port": 4021, "frontend": true, "clientPort": 4001, },
        ],
        "katagoAnalysis" : [
            { "id": "katagoAnalysis-server-1", "host": "127.0.0.1", "port": 6021 },
        ],
        "katagoGTP" : [
            { "id": "katagoGTP-server-1", "host": "127.0.0.1", "port": 7021 },
        ]
    }
}