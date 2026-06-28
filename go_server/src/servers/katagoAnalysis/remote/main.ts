import { Session } from "inspector";
import Application from "../../../../lib/application";
import KataGo from "../../../app/katagoGTP/katagoGTP";

export default class Remote {

    app: Application;
    constructor(app: Application) {
        this.app = app;
    }

    async use(id: number) {
        if (this.app.get("userId") == undefined || this.app.get("userId") == id) {
            this.app.set("userId", id);
            return true;
        }
        return false;
    }

    async unuse(id: number) {
        if (this.app.get("userId") == id) {
            this.app.set("userId", undefined);
            return true;
        }
        return false;
    }
}