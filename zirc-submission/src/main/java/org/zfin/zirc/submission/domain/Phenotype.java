package org.zfin.zirc.submission.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.*;

@Entity
@Table(name = "phenotype")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Phenotype {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mutation_id", nullable = false)
    private Mutation mutation;

    private Integer sortOrder;

    @Column(columnDefinition = "text")
    private String description;

    private Integer hoursPostFertilization;
    private String stage;
    private Boolean zircImagePermission;

    @ElementCollection
    @CollectionTable(name = "phenotype_segregation",
            joinColumns = @JoinColumn(name = "phenotype_id"))
    @Column(name = "segregation")
    @Builder.Default
    private Set<String> segregation = new LinkedHashSet<>();

    private Double nonMendelianPercentage;

    @ElementCollection
    @CollectionTable(name = "phenotype_type",
            joinColumns = @JoinColumn(name = "phenotype_id"))
    @Column(name = "type")
    @Builder.Default
    private Set<String> phenotypeTypes = new LinkedHashSet<>();
}
