package com.tessera.state;

import java.util.UUID;

/**
 * Represents a shared visual element on the Tessera collaborative stage.
 * Positions are normalized [0.0, 1.0] relative to the stage dimensions.
 */
public class CanvasElement {

    private final String id;
    private final ElementType type;
    private final String label;
    private volatile double x;
    private volatile double y;
    private final double width;
    private final double height;

    public CanvasElement(ElementType type, String label, double x, double y, double width, double height) {
        this.id = UUID.randomUUID().toString();
        this.type = type;
        this.label = label;
        this.x = clamp(x);
        this.y = clamp(y);
        this.width = width;
        this.height = height;
    }

    // ── Getters ──────────────────────────────────────────────────────────────

    public String getId() { return id; }
    public ElementType getType() { return type; }
    public String getLabel() { return label; }
    public double getX() { return x; }
    public double getY() { return y; }
    public double getWidth() { return width; }
    public double getHeight() { return height; }

    // ── Setters (synchronized at Room level) ─────────────────────────────────

    public void setX(double x) { this.x = clamp(x); }
    public void setY(double y) { this.y = clamp(y); }
    public void setPosition(double x, double y) {
        this.x = clamp(x);
        this.y = clamp(y);
    }

    private static double clamp(double v) {
        return Math.max(0.0, Math.min(1.0, v));
    }

    /** Snapshot map for JSON serialization */
    public java.util.Map<String, Object> toMap(String lockedBy) {
        var m = new java.util.LinkedHashMap<String, Object>();
        m.put("id", id);
        m.put("type", type.name());
        m.put("label", label);
        m.put("x", x);
        m.put("y", y);
        m.put("width", width);
        m.put("height", height);
        m.put("lockedBy", lockedBy);
        return m;
    }
}
