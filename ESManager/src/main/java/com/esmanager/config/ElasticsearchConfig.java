package com.esmanager.config;

import org.apache.http.HttpHost;
import org.apache.http.auth.AuthScope;
import org.apache.http.auth.UsernamePasswordCredentials;
import org.apache.http.impl.client.BasicCredentialsProvider;
import org.elasticsearch.client.RestClient;
import org.elasticsearch.client.RestClientBuilder;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(ElasticsearchProperties.class)
public class ElasticsearchConfig {

    @Bean(destroyMethod = "close")
    public RestClient restClient(ElasticsearchProperties properties) {
        RestClientBuilder builder = RestClient.builder(new HttpHost(properties.getHost(), properties.getPort(), properties.getScheme()));
        builder.setRequestConfigCallback(config -> config
                .setConnectTimeout((int) properties.getConnectTimeout().toMillis())
                .setSocketTimeout((int) properties.getSocketTimeout().toMillis()));
        builder.setHttpClientConfigCallback(httpClientBuilder -> {
            BasicCredentialsProvider credentialsProvider = new BasicCredentialsProvider();
            credentialsProvider.setCredentials(AuthScope.ANY,
                    new UsernamePasswordCredentials(properties.getUsername(), properties.getPassword()));
            return httpClientBuilder.setDefaultCredentialsProvider(credentialsProvider);
        });
        return builder.build();
    }
}
