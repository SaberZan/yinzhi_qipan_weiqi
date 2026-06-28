using System;
using Easy;

public class OnLineKatago : IKatago
{
    public async EasyEmptyTask Start(Action<bool> callback)
    {
        bool resultTag = false;
        var msg = new UseKatagoMsg() { katagoType = "katagoGTP" };
        KatagoBaseMsg.katagoType = "katagoGTP";
        NetMgr.Instance.SendMsg(UseKatagoResultMsg.protocol, msg, resultMsg =>
        {
            resultTag = ((UseKatagoResultMsg)resultMsg).result;
        });
        await EasyTaskRunner.WaitUntil(() => resultTag);
        callback(resultTag);
    }

    public async EasyEmptyTask Close(Action callback)
    {
        var msg = new UnuseKatagoMsg();
        NetMgr.Instance.SendMsg(UnuseKatagoResultMsg.protocol, msg, resultMsg =>
        {

        });
    }

    public async EasyEmptyTask InitGame(int size, string rule, float komi, int handicap, int rank, string player)
    {
        bool resultTag = false;
        var sendMsg = new KatagoInitGameMsg() { rule = rule, handicap = handicap, komi = komi, size = size, rank = rank, player = player };
        NetMgr.Instance.SendMsg(KatagoInitGameResultMsg.protocol, sendMsg, resultMsg =>
        {
            resultTag = true;
        });
        await EasyTaskRunner.WaitUntil(()=>resultTag);
    }

    public async EasyTask<KatagoGenMoveResultMsg> Genmove(string color, Action<KatagoGenMoveResultMsg> callback)
    {
        bool resultTag = false;
        KatagoGenMoveResultMsg result = null;
        var sendMsg = new KatagoGenMoveMsg() { color = color };
        NetMgr.Instance.SendMsg(KatagoGenMoveResultMsg.protocol, sendMsg, resultMsg =>
        {
            resultTag = true;
            result = ((KatagoGenMoveResultMsg)resultMsg);
        });
        await EasyTaskRunner.WaitUntil(() => resultTag);
        callback(result);
        return result;
    }

    public async EasyTask<KatagoPlayResultMsg> Play(string color, string gtp, Action<KatagoPlayResultMsg> callback)
    {
        bool resultTag = false;
        KatagoPlayResultMsg result = null;
        var msg = new KatagoPlayMsg() { color = color, gtp = gtp };
        NetMgr.Instance.SendMsg(KatagoPlayResultMsg.protocol, msg, resultMsg =>
        {
            resultTag = true;
            result = ((KatagoPlayResultMsg)resultMsg);
        });
        await EasyTaskRunner.WaitUntil(() => resultTag);
        callback(result);
        return result;
    }

    public async EasyEmptyTask Resign()
    {
        bool resultTag = false;
        var msg = new KatagoResignMsg();
        NetMgr.Instance.SendMsg(KatagoResignResultMsg.protocol, msg, resultMsg =>
        {
            resultTag = true;
        });
        await EasyTaskRunner.WaitUntil(() => resultTag);
    }

    public async EasyTask<KatagoManualScoreResultMsg> ManualScore()
    {
        bool resultTag = false;
        var msg = new KatagoManualScoreMsg();
        KatagoManualScoreResultMsg result = null;
        NetMgr.Instance.SendMsg(KatagoManualScoreResultMsg.protocol, msg, resultMsg =>
        {
            resultTag = true;
            result = (KatagoManualScoreResultMsg)resultMsg;
        });
        await EasyTaskRunner.WaitUntil(() => resultTag);
        return result;
    }

}