import Application from "../../../../lib/application";

export default class Remote {

    constructor(app: Application) {

    }

    async test(msg: string) {
        console.log("rpc get:", msg);
        return "haha";
    }
}