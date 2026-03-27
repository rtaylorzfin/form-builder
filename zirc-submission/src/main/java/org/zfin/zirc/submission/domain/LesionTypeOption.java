package org.zfin.zirc.submission.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "lesion_type_option")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LesionTypeOption {

    @Id
    private String value;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private Integer sortOrder = 0;

    @Column(nullable = false)
    private Boolean active = true;
}
