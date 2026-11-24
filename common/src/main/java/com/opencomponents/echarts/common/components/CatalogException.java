package com.opencomponents.echarts.common.components;

/**
 * Thrown when the component manifest, a prop schema or an event schema that
 * ships with the module is missing or malformed. The message names the
 * component and the classpath resource at fault.
 */
public class CatalogException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public CatalogException(String message) {
        super(message);
    }

    public CatalogException(String message, Throwable cause) {
        super(message, cause);
    }
}
