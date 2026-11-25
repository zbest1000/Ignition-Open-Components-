package com.opencomponents.echarts.common.components;

import java.io.ByteArrayInputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import com.inductiveautomation.ignition.common.gson.JsonObject;
import com.inductiveautomation.ignition.common.gson.JsonParser;

/** Test helpers for reading the packaged resources and for simulating broken ones. */
final class TestResources {

    private TestResources() {
    }

    /** Reads a packaged resource as text. */
    static String text(String path) {
        try (InputStream in = ResourceSource.CLASSPATH.open(path)) {
            if (in == null) {
                throw new AssertionError("Resource not on the classpath: " + path);
            }
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** Parses a packaged resource with plain Gson, independently of the production loader. */
    static JsonObject json(String path) {
        return JsonParser.parseString(text(path)).getAsJsonObject();
    }

    /** Lists the JSON files in a packaged resource directory as classpath paths, e.g. {@code props/a.json}. */
    static List<String> jsonFilesIn(String directory) {
        URL url = TestResources.class.getResource("/" + directory);
        if (url == null || !"file".equals(url.getProtocol())) {
            throw new AssertionError("Expected resource directory '" + directory + "' on the file system, got " + url);
        }
        try (Stream<Path> files = Files.walk(Path.of(url.toURI()))) {
            Path root = Path.of(url.toURI());
            return files.filter(p -> p.toString().endsWith(".json"))
                .map(p -> directory + "/" + root.relativize(p).toString().replace('\\', '/'))
                .sorted()
                .toList();
        } catch (IOException | URISyntaxException e) {
            throw new AssertionError(e);
        }
    }

    /**
     * The packaged resources with some paths replaced ({@code null} content
     * means "missing"). Records every stream it hands out and whether it was closed.
     */
    static final class Overlay implements ResourceSource {

        private final Map<String, String> replaced = new HashMap<>();
        private final Set<String> opened = new HashSet<>();
        private final Set<String> closed = new HashSet<>();

        Overlay with(String path, String content) {
            replaced.put(path, content);
            return this;
        }

        Overlay without(String path) {
            replaced.put(path, null);
            return this;
        }

        Set<String> opened() {
            return opened;
        }

        Set<String> leftOpen() {
            Set<String> open = new HashSet<>(opened);
            open.removeAll(closed);
            return open;
        }

        @Override
        public InputStream open(String path) throws IOException {
            InputStream in;
            if (replaced.containsKey(path)) {
                String content = replaced.get(path);
                in = content == null ? null : new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8));
            } else {
                in = ResourceSource.CLASSPATH.open(path);
            }
            if (in == null) {
                return null;
            }
            opened.add(path);
            return new FilterInputStream(in) {
                @Override
                public void close() throws IOException {
                    closed.add(path);
                    super.close();
                }
            };
        }
    }
}
