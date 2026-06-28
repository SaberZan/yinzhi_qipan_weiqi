public class KatagoGenMoveResultMsg : BaseMsg
{
    public const string protocol = "katagoGTP.main.genMove";
    public string player;
    public string move;
    public float blackWinRate;

    public float[] ownerShip;
}
