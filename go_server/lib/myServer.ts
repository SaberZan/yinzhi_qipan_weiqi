import Application from "./application";
import { I_connectorConstructor } from "./util/interfaceDefine";
import { ConnectorTcp } from "./connector/connectorProxyTcp";
import { ConnectorWs } from "./connector/connectorProxyWs";

interface I_Server {
    version: string,
    createApp: () => Application,
    app: Application,
    connector: {
        Tcp: I_connectorConstructor,
        Ws: I_connectorConstructor,
    }
}


let hasCreated = false;
let myServer: I_Server = {} as any;
myServer.version = "1.0.0";
myServer.createApp = function () {
    if (hasCreated) {
        console.error("the app has already been created");
        return myServer.app;
    }
    hasCreated = true;
    myServer.app = new Application();
    return myServer.app;
};

myServer.connector = {
    "Tcp": ConnectorTcp,
    "Ws": ConnectorWs,
};


export = myServer