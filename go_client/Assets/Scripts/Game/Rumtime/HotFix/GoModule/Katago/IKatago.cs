using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Easy;

public interface IKatago
{
    public EasyEmptyTask Start(Action<bool> callback);

    public EasyEmptyTask Close(Action callback);

    public EasyEmptyTask InitGame(int size, string rule, float komi, int handicap, int rank, string player);

    public EasyTask<KatagoPlayResultMsg> Play(string color, string gtp, Action<KatagoPlayResultMsg> callback);

    public EasyTask<KatagoGenMoveResultMsg> Genmove(string color, Action<KatagoGenMoveResultMsg> callback);

    public EasyEmptyTask Resign();

    public EasyTask<KatagoManualScoreResultMsg> ManualScore();
}