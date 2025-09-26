package com.esmanager.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@Data
@ConfigurationProperties(prefix = "elasticsearch")
public class ElasticsearchProperties {

    private String host = "localhost";
    private int port = 9200;
    private String scheme = "http";
    private String username = "admin";
    private String password = "admin123";
    private Duration connectTimeout = Duration.ofSeconds(10);
    private Duration socketTimeout = Duration.ofSeconds(30);
}
