package com.opencomponents.echarts.gateway.api;

import com.inductiveautomation.ignition.common.gson.JsonArray;
import com.inductiveautomation.ignition.common.gson.JsonObject;
import com.inductiveautomation.ignition.common.gson.JsonParser;
import com.inductiveautomation.ignition.common.util.LoggerEx;
import com.inductiveautomation.ignition.gateway.dataroutes.RequestContext;
import com.inductiveautomation.ignition.gateway.dataroutes.RouteGroup;
import jakarta.servlet.http.HttpServletResponse;

/**
 * REST endpoints for theme management. Mounted under the module's route group
 * at {@code /system/data/open-echarts/themes}.
 *
 * <ul>
 *   <li>GET  /themes          — list all theme names</li>
 *   <li>GET  /themes/:name    — load theme JSON by name</li>
 *   <li>POST /themes/:name    — save theme (body = theme JSON)</li>
 *   <li>POST /themes/:name/delete — delete theme</li>
 * </ul>
 */
public class ThemeEndpoints {

    private static final LoggerEx log = LoggerEx.newBuilder().build(ThemeEndpoints.class);

    private final ThemeRepository repo;

    public ThemeEndpoints(ThemeRepository repo) {
        this.repo = repo;
    }

    public void mount(RouteGroup routes) {
        routes.newRoute("/themes")
            .type(RouteGroup.TYPE_JSON)
            .handler(this::listThemes)
            .mount();

        routes.newRoute("/themes/:name")
            .type(RouteGroup.TYPE_JSON)
            .handler(this::getTheme)
            .mount();

        routes.newRoute("/themes/:name/save")
            .type(RouteGroup.TYPE_JSON)
            .handler(this::saveTheme)
            .mount();

        routes.newRoute("/themes/:name/delete")
            .type(RouteGroup.TYPE_JSON)
            .handler(this::deleteTheme)
            .mount();
    }

    private JsonArray listThemes(RequestContext req, HttpServletResponse resp) {
        JsonArray arr = new JsonArray();
        for (String name : repo.listNames()) {
            arr.add(name);
        }
        return arr;
    }

    private JsonObject getTheme(RequestContext req, HttpServletResponse resp) {
        String name = req.getParameter("name");
        var json = repo.load(name);
        if (json.isEmpty()) {
            resp.setStatus(404);
            JsonObject err = new JsonObject();
            err.addProperty("error", "Theme not found: " + name);
            return err;
        }
        try {
            return JsonParser.parseString(json.get()).getAsJsonObject();
        } catch (Exception e) {
            resp.setStatus(500);
            JsonObject err = new JsonObject();
            err.addProperty("error", "Invalid theme JSON: " + e.getMessage());
            return err;
        }
    }

    private JsonObject saveTheme(RequestContext req, HttpServletResponse resp) {
        String name = req.getParameter("name");
        JsonObject result = new JsonObject();
        String body;
        try {
            body = req.readBody();
        } catch (Exception e) {
            resp.setStatus(400);
            result.addProperty("error", "Failed to read request body: " + e.getMessage());
            return result;
        }

        if (body == null || body.isBlank()) {
            resp.setStatus(400);
            result.addProperty("error", "Request body is empty");
            return result;
        }

        try {
            JsonParser.parseString(body).getAsJsonObject();
        } catch (Exception e) {
            resp.setStatus(400);
            result.addProperty("error", "Invalid JSON: " + e.getMessage());
            return result;
        }

        if (repo.save(name, body)) {
            log.info("Theme saved: " + name);
            result.addProperty("status", "saved");
            result.addProperty("name", name);
        } else {
            resp.setStatus(500);
            result.addProperty("error", "Failed to save theme");
        }
        return result;
    }

    private JsonObject deleteTheme(RequestContext req, HttpServletResponse resp) {
        String name = req.getParameter("name");
        JsonObject result = new JsonObject();
        if (repo.delete(name)) {
            log.info("Theme deleted: " + name);
            result.addProperty("status", "deleted");
            result.addProperty("name", name);
        } else {
            resp.setStatus(404);
            result.addProperty("error", "Theme not found: " + name);
        }
        return result;
    }
}
