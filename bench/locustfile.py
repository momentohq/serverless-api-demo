from locust import HttpUser, task, between


class StartUser(HttpUser):
    wait_time = between(1, 2)

    @task
    def get_user(self):
        self.client.get("/users?id=a1a843a9-ebc5-4ed6-ab1f-7e9a277f7c6f")

    @task
    def get_cached_user(self):
        self.client.get("/cached-users?id=a1a843a9-ebc5-4ed6-ab1f-7e9a277f7c6f")
