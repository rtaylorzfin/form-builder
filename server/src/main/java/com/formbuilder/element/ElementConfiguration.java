package com.formbuilder.element;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ElementConfiguration {

    private String placeholder;
    @JsonInclude(JsonInclude.Include.NON_DEFAULT)
    @Builder.Default
    private Boolean required = false;
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
    private Boolean allowOther;
    private Boolean trackCompletion;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Option {
        private String label;
        private String value;
    }
}
