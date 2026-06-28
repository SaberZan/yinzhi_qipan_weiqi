using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using Easy;
using UnityEngine;

[LayerParams(layerType = LayerType.NORMAL_DYNAMIC, order = 1)]
public class GameLayer : BaseUILayer
{
    public T ShowView<T>(string path = null) where T : BaseUI, new()
    {
        if (GetView<T>() != null)
        {
            var view = GetView<T>();
            view.Show();
            return view;
        }

        var ui = new T();
        if (string.IsNullOrEmpty(path))
        {
            ui.SetPrefabPath("Assets/GameResources/Go/" + ui.GetUIName() + ".prefab");
        }
        else
        {
            ui.SetPrefabPath(path);
        }
        AddSubUI(ui);
        ui.Show();
        ui.baseGameObject.transform.SetParent(baseGameObject.transform, false);
        return ui;
    }


    public void HideView(string uiName)
    {
        foreach (var ui in subUIs)
        {
            if (ui.GetUIName() == uiName)
            {
                ui.Hide();
                return;
            }
        }
    }

    public void HideViews(params string[] names)
    {
        foreach (string name in names)
        {
            HideView(name);
        }
    }

    public void HideAll()
    {
        foreach (var subUI in subUIs)
        {
            subUI.Hide();
        }
    }


    public void CloseView(string uiName)
    {
        for (int i = subUIs.Count -1; i >= 0; --i)
        {
            var ui = subUIs[i];
            if (ui.GetUIName() == uiName)
            {
                ui.Destroy();
                subUIs.RemoveAt(i);
                return;
            }
        }
    }

    public void CloseViews(params string[] names)
    {
        foreach (string name in names)
        {
            CloseView(name);
        }
    }

    public void CloseAll()
    {
        foreach (var subUI in subUIs)
        {
            subUI.Destroy();
        }
    }

    public T GetView<T>() where T : BaseUI, new()
    {
        var uiName = typeof(T).Name;
        foreach (var ui in subUIs)
        {
            if (ui.GetUIName() == uiName)
            {
                return ui as T;
            }
        }
        return null;
    }
}
