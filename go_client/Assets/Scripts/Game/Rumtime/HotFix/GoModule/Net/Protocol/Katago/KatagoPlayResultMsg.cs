public class KatagoPlayResultMsg : BaseMsg
{
    public const string protocol = "katagoGTP.main.play";

    public float blackWinRate;

    public float[] ownerShip;
}
