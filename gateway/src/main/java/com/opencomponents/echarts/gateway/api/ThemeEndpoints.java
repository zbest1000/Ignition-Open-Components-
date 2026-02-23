package com.opencomponents.echarts.gateway.api;

import com.inductiveautomation.ignition.common.gson.JsonArray;
import com.inductiveautomation.ignition.common.gson.JsonObject;
import com.inductiveautomation.ignition.common.gson.JsonParser;
import com.inductiveautomation.ignition.common.util.LoggerEx;
import com.inductiveautomation.ignition.gateway.dataroutes.RouteGroup;

/**
 * REST endpoints for theme CRUD, mounted under the module's route group at
 * {@code /system/data/<moduleId>/themes}.
 */
public class ThemeEndpoints {

    private static final LoggerEx log = LoggerEx.newBuilder().build(ThemeEndpoints.class);

    private final ThemeRepository repo;

    public ThemeEndpoints(ThemeRepository repo) {
        this.repo = repo;
    }

    public void mount(RouteGroup routes) {
        routes.newRoute("/themes")
            .handler((req, resp) -> {
                JsonArray arr = new JsonArray();
                for (String name : repo.listNames()) {
                    arr.add(name);
                }
                return arr;
            })
            .type(RouteGroup.TYPE_JSON)
            .mount();

        routes.newRoute("/themes/:name")
            .handler((req, resp) -> {
                String name = req.getParameter("name");
                var json = repo.load(name);
                if (json.isEmpty()) {
                    JsonObject err = new JsonObject();
                    err.addProperty("error", "Theme not found: " + name);
                    return err;
                }
                return JsonParser.parseString(json.get());
            })
            .type(RouteGroup.TYPE_JSON)
            .mount();
    }
}
