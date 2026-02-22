package com.formbuilder.element;

import com.formbuilder.form.Form;
import com.formbuilder.page.FormPage;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "form_elements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FormElement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "form_id", nullable = false)
    private Form form;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ElementType type;

    @Column(nullable = false)
    private String label;

    @Column(name = "field_name", nullable = false)
    private String fieldName;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @Convert(converter = JsonConverter.class)
    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private ElementConfiguration configuration = new ElementConfiguration();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "page_id", nullable = false)
    private FormPage page;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_element_id")
    private FormElement parentElement;

    @OneToMany(mappedBy = "parentElement", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<FormElement> children = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
