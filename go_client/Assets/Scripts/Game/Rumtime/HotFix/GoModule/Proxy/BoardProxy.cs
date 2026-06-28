using Easy;

public class BoardProxy : Proxy
{
    public void SetCurBoardSize(int size)
    {
        CacheDataMgr.Instance.Get<BoardCacheData>().curboardsize = size;
    }

    public int GetCurBoardSize()
    {
        return CacheDataMgr.Instance.Get<BoardCacheData>().curboardsize;
    }

    public void SetSelfColor(bool color)
    {
        CacheDataMgr.Instance.Get<BoardCacheData>().selfColor = color;
    }

    public bool GetSelfColor()
    {
        return CacheDataMgr.Instance.Get<BoardCacheData>().selfColor;
    }

    public void SetRule(string rule)
    {
        CacheDataMgr.Instance.Get<BoardCacheData>().rule = rule;
    }

    public string GetRule()
    {
        return CacheDataMgr.Instance.Get<BoardCacheData>().rule;
    }

    public void SetOtherRank(int rank)
    {
        CacheDataMgr.Instance.Get<BoardCacheData>().otherRank = rank;
    }

    public int GetOtherRank()
    {
        return CacheDataMgr.Instance.Get<BoardCacheData>().otherRank;
    }

    public void SetKomi(float komi)
    {
        CacheDataMgr.Instance.Get<BoardCacheData>().komi = komi;
    }

    public float GetKomi()
    {
        return CacheDataMgr.Instance.Get<BoardCacheData>().komi;
    }

    public void SetHandicap(int handicap)
    {
        CacheDataMgr.Instance.Get<BoardCacheData>().handicap = handicap;
    }

    public int GetHandicap()
    {
        return CacheDataMgr.Instance.Get<BoardCacheData>().handicap;
    }
}