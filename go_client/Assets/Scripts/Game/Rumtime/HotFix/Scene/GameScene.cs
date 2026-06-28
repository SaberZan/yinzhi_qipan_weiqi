using System.Collections;
using System.Collections.Generic;
using Easy;
using UnityEngine;

public class GameScene : MonoBehaviour
{
    // Start is called before the first frame update

    private GameModules gameModules;
    void Start()
    {
        gameModules = new GameModules();

        gameModules.Register(new GoModule());

        gameModules.Start();
    }

    // Update is called once per frame
    void Update()
    {
        gameModules.Update(Time.deltaTime);
    }

    private void OnDestroy()
    {
        gameModules.Destory();
    }
}
