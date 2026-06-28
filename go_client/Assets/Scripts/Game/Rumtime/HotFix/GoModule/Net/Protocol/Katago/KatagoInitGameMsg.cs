using System;

[Serializable]
public class KatagoInitGameMsg : BaseMsg
{

    public int size;

    public string rule;

    public float komi;

    public int handicap;

    public int rank;

    public string player;

}
