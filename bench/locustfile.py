from locust import HttpUser, task, between


class StartUser(HttpUser):
    wait_time = between(1, 2)

    @task
    def get_user(self):
        self.client.get("/get-user?id=fdd0ec6c-9c1f-44ec-ab00-400571b3f8da")

    @task
    def get_cached_user(self):
        self.client.get("/get-cached-user?id=fdd0ec6c-9c1f-44ec-ab00-400571b3f8da")