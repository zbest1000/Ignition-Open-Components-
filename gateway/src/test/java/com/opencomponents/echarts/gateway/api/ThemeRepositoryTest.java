package com.opencomponents.echarts.gateway.api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ThemeRepositoryTest {

    @TempDir
    Path tempDir;

    private ThemeRepository repo;

    @BeforeEach
    void setUp() {
        repo = new ThemeRepository(tempDir);
    }

    @Test
    void emptyRepoListsNoThemes() {
        List<String> names = repo.listNames();
        assertNotNull(names);
        assertTrue(names.isEmpty());
    }

    @Test
    void saveAndLoadTheme() {
        String json = "{\"color\":[\"#ff0000\"],\"darkMode\":false}";
        assertTrue(repo.save("TestTheme", json));

        var loaded = repo.load("TestTheme");
        assertTrue(loaded.isPresent());
        assertEquals(json, loaded.get());
    }

    @Test
    void listNamesAfterSave() {
        repo.save("Alpha", "{}");
        repo.save("Beta", "{}");

        List<String> names = repo.listNames();
        assertEquals(2, names.size());
        assertTrue(names.contains("Alpha"));
        assertTrue(names.contains("Beta"));
    }

    @Test
    void loadNonExistentThemeReturnsEmpty() {
        var loaded = repo.load("DoesNotExist");
        assertTrue(loaded.isEmpty());
    }

    @Test
    void deleteExistingTheme() {
        repo.save("ToDelete", "{}");
        assertTrue(repo.delete("ToDelete"));
        assertTrue(repo.load("ToDelete").isEmpty());
    }

    @Test
    void deleteNonExistentThemeReturnsFalse() {
        assertFalse(repo.delete("Nonexistent"));
    }

    @Test
    void saveOverwritesExisting() {
        repo.save("Overwrite", "{\"v\":1}");
        repo.save("Overwrite", "{\"v\":2}");

        var loaded = repo.load("Overwrite");
        assertTrue(loaded.isPresent());
        assertTrue(loaded.get().contains("\"v\":2"));
    }

    @Test
    void nameIsSanitized() {
        assertTrue(repo.save("../evil/path", "{}"));
        var names = repo.listNames();
        assertTrue(names.stream().noneMatch(n -> n.contains("/")));
    }
}
