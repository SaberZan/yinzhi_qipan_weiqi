import { Users } from "../../../app/users";
import { MongoClient, Db } from "mongodb";
import Application from "../../../../lib/application";
import { Session } from "../../../../lib/components/session";


export default class Handler {
    private app: Application;

    client: MongoClient | undefined;

    userDb: Db | undefined;
 
    constructor(app: Application) {
        this.app = app;
    }

    async login(msg: { sequenceId: number, accountInfo: { account: string, password: string } }, session: Session, next: Function) {
        if (Users[msg.accountInfo.account] && Users[msg.accountInfo.account].password == msg.accountInfo.password) {
            next({
                sequenceId: msg.sequenceId,
                code: 200,
                host: "192.168.3.65",
                port: 4001,
                uid: Users[msg.accountInfo.account].uid,
                userName: Users[msg.accountInfo.account].userName
            });
            return;
        }
        next({ sequenceId: msg.sequenceId, code: 1});
    }
    

      
    async register(msg: { sequenceId: number, accountInfo: { account: string, password: string }, "userName": string }, session: Session, next: Function) {
        next({ sequenceId: msg.sequenceId, code: 1 });
    }

}