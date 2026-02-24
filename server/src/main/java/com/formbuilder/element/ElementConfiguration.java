package com.formbuilder.element;

import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ElementConfiguration {

    private String placeholder;
    private Boolean required;
    private Integer minLength;
    private Integer maxLength;
    private Double min;
    private Double max;
    private String pattern;
    private String patternMessage;
    private List<Option> options;
    private String defaultValue;
    private String content;
    private Boolean repeatable;
    private Integer minInstances;
    private Integer maxInstances;
    private Boolean fullPage;
    private String instanceLabel;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Option {
        private String label;
        private String value;
    }
}
