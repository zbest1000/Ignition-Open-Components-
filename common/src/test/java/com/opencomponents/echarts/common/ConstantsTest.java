package com.opencomponents.echarts.common;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ConstantsTest {

    @Test
    void moduleIdIsNotBlank() {
        assertNotNull(OpenEChartsConstants.MODULE_ID);
        assertFalse(OpenEChartsConstants.MODULE_ID.isBlank());
    }

    @Test
    void moduleUrlAliasIsNotBlank() {
        assertNotNull(OpenEChartsConstants.MODULE_URL_ALIAS);
        assertFalse(OpenEChartsConstants.MODULE_URL_ALIAS.isBlank());
    }

    @Test
    void componentCategoryIsNotBlank() {
        assertNotNull(OpenEChartsConstants.COMPONENT_CATEGORY);
        assertFalse(OpenEChartsConstants.COMPONENT_CATEGORY.isBlank());
    }

    @Test
    void industrialCategoryIsNotBlank() {
        assertNotNull(OpenEChartsConstants.INDUSTRIAL_COMPONENT_CATEGORY);
        assertFalse(OpenEChartsConstants.INDUSTRIAL_COMPONENT_CATEGORY.isBlank());
    }
}
