package com.opencomponents.echarts.common.utilities;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.IOException;
import javax.imageio.ImageIO;

/**
 * Loads and resizes images from classpath resources for use as palette
 * thumbnails in the Ignition Designer.
 */
public class ImageUtilities {

    private static BufferedImage loadImage(String resourcePath) {
        try {
            return ImageIO.read(ImageUtilities.class.getResourceAsStream(resourcePath));
        } catch (IOException e) {
            e.printStackTrace();
            return null;
        }
    }

    public static BufferedImage loadThumbnailFromFilePath(
            String resourcePath, int width, int height) {
        BufferedImage original = loadImage(resourcePath);
        if (original == null) {
            return null;
        }

        BufferedImage resized = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = resized.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                           RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.setRenderingHint(RenderingHints.KEY_RENDERING,
                           RenderingHints.VALUE_RENDER_QUALITY);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,
                           RenderingHints.VALUE_ANTIALIAS_ON);
        g.drawImage(original, 0, 0, width, height, null);
        g.dispose();
        return resized;
    }
}
